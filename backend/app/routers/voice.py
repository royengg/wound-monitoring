import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import requests
from fastapi import APIRouter, HTTPException
from botocore.exceptions import ClientError
from app.config import get_settings
from app.models.schemas import VoiceCallRequest, VoiceCallResponse, VoiceCallRecord
from app.services.dynamodb import (
    get_patient,
    get_assessments_by_patient,
    put_voice_call,
    get_voice_calls_by_patient,
    update_voice_call,
)
from app.utils.helpers import format_phone_e164

logger = logging.getLogger(__name__)

settings = get_settings()

router = APIRouter()


@router.post("/call", response_model=VoiceCallResponse)
async def trigger_voice_call(data: VoiceCallRequest):
    """
    Trigger an outbound voice call to the patient via Vapi.
    Uses the Bedrock-generated voice_agent_script from the latest assessment,
    falling back to a basic script if none is available.
    """
    try:
        patient = get_patient(data.patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching patient"
        )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get latest assessment for context
    try:
        assessments = get_assessments_by_patient(data.patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching assessments"
        )

    latest = assessments[0] if assessments else None

    # Prefer the Bedrock-generated voice_agent_script (personalised + clinically contextual).
    # Fall back to a manually built script only when no assessment or script exists.
    if latest and latest.get("voice_agent_script"):
        script = latest["voice_agent_script"]
    elif latest:
        script = (
            f"Hi {patient.get('name', 'there')}. "
            f"I've reviewed your wound photo from today. "
            f"Your healing score is {latest.get('healing_score', 'N/A')} out of 10. "
            f"{latest.get('summary', '')} "
        )
        if latest.get("urgency_level") == "high":
            script += "I'd recommend connecting you with your doctor. Let me transfer you now."
        else:
            script += "Keep following your care instructions, and I'll check in again tomorrow."
    else:
        script = (
            f"Hi {patient.get('name', 'there')}. "
            f"I don't have a recent wound assessment on file. "
            f"Please upload a photo through the app so I can review your progress."
        )

    # ── Guard: return simulated response when Vapi isn't configured ──
    if (
        not settings.vapi_api_key
        or not settings.vapi_assistant_id
        or not settings.vapi_phone_number_id
    ):
        logger.warning("Vapi credentials missing. Returning simulated response.")
        # Still store a record so it shows up in call history
        call_record = {
            "call_id": str(uuid.uuid4()),
            "patient_id": data.patient_id,
            "conversation_id": "simulated_no_credentials",
            "status": "simulated",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            put_voice_call(call_record)
        except ClientError:
            logger.warning("Failed to store simulated voice call record")

        return VoiceCallResponse(
            conversation_id="simulated_no_credentials",
            patient_id=data.patient_id,
            status="simulated",
            message=script,
        )

    # ── Build Vapi outbound call payload ──
    headers = {
        "Authorization": f"Bearer {settings.vapi_api_key}",
        "Content-Type": "application/json",
    }

    formatted_phone = format_phone_e164(patient.get("phone", ""))
    language = patient.get("language_preference", "hi-IN")

    payload = {
        "assistantId": settings.vapi_assistant_id,
        "phoneNumberId": settings.vapi_phone_number_id,
        "customer": {
            "number": formatted_phone,
        },
        "assistantOverrides": {
            "variableValues": {
                "patient_name": patient.get("name", "there"),
                "language": language,
                "script": script,
                "healing_score": str(latest.get("healing_score", "N/A"))
                if latest
                else "N/A",
                "clinical_summary": latest.get("summary", "")
                if latest
                else "No recent photo uploaded.",
            },
        },
    }

    try:
        url = "https://api.vapi.ai/call/phone"
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        result = resp.json()

        conversation_id = result.get("id", "unknown")

        # Store the call record in DynamoDB
        call_record = {
            "call_id": str(uuid.uuid4()),
            "patient_id": data.patient_id,
            "conversation_id": conversation_id,
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            put_voice_call(call_record)
        except ClientError:
            logger.warning("Failed to store voice call record for %s", conversation_id)

        return VoiceCallResponse(
            conversation_id=conversation_id,
            patient_id=data.patient_id,
            status="initiated",
            message=script,
        )
    except requests.exceptions.RequestException as e:
        logger.error(
            "Vapi outbound call failed: %s | Response: %s",
            str(e),
            getattr(e.response, "text", ""),
        )
        raise HTTPException(
            status_code=502, detail="Failed to trigger voice call via Vapi"
        )


# Structured output IDs from Vapi assistant configuration
SUMMARY_OUTPUT_ID = "75e3d794-2f2a-40db-af64-33d11dd077f4"
SUPERVISOR_REVIEW_OUTPUT_ID = "d7e5b6e4-73b9-4577-b4bb-e0957eaaa014"


@router.get("/calls/{patient_id}", response_model=list[VoiceCallRecord])
async def get_patient_voice_calls(patient_id: str):
    """
    Get all voice call records for a patient, resolving any pending calls
    by fetching their status from the Vapi API and caching the results.
    """
    try:
        calls = get_voice_calls_by_patient(patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching voice calls"
        )

    if not calls:
        return []

    has_vapi_creds = bool(
        settings.vapi_api_key
        and settings.vapi_assistant_id
    )

    # Resolve any unfinished calls by checking Vapi API
    for call in calls:
        if call.get("status") in ("ended", "failed", "simulated"):
            continue
        if not has_vapi_creds:
            continue

        conversation_id = call.get("conversation_id", "")
        if not conversation_id or conversation_id.startswith("simulated"):
            continue

        try:
            vapi_resp = requests.get(
                f"https://api.vapi.ai/call/{conversation_id}",
                headers={
                    "Authorization": f"Bearer {settings.vapi_api_key}",
                },
                timeout=10,
            )
            vapi_resp.raise_for_status()
            vapi_data = vapi_resp.json()
        except requests.exceptions.RequestException as e:
            logger.warning(
                "Failed to fetch Vapi call %s: %s", conversation_id, str(e)
            )
            continue

        vapi_status = vapi_data.get("status", "")
        if vapi_status != "ended":
            # Update status but don't extract artifacts yet
            if vapi_status and vapi_status != call.get("status"):
                try:
                    update_voice_call(call["call_id"], {"status": vapi_status})
                    call["status"] = vapi_status
                except ClientError:
                    pass
            continue

        # Call has ended — extract artifacts and cache them
        artifact = vapi_data.get("artifact", {})
        transcript = artifact.get("transcript", "")

        # Extract structured outputs
        structured_outputs = artifact.get("structuredOutputs", {})
        summary_output = structured_outputs.get(SUMMARY_OUTPUT_ID, {})
        supervisor_output = structured_outputs.get(SUPERVISOR_REVIEW_OUTPUT_ID, {})

        summary = summary_output.get("result", "")
        supervisor_review = supervisor_output.get("result")

        # Duration in seconds
        duration = None
        started_at = vapi_data.get("startedAt")
        ended_at = vapi_data.get("endedAt")
        if started_at and ended_at:
            try:
                from datetime import datetime as dt

                start = dt.fromisoformat(started_at.replace("Z", "+00:00"))
                end = dt.fromisoformat(ended_at.replace("Z", "+00:00"))
                duration = Decimal(str(round((end - start).total_seconds(), 1)))
            except (ValueError, TypeError):
                pass

        updates = {
            "status": "ended",
            "transcript": transcript or None,
            "summary": summary or None,
            "ended_reason": vapi_data.get("endedReason", ""),
        }
        if supervisor_review is not None:
            updates["supervisor_review_needed"] = supervisor_review
        if duration is not None:
            updates["duration_seconds"] = duration

        try:
            update_voice_call(call["call_id"], updates)
            call.update(updates)
        except ClientError:
            logger.warning("Failed to cache resolved voice call %s", call["call_id"])

    return calls
