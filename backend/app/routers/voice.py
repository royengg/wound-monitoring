import logging
import requests
from fastapi import APIRouter, HTTPException
from botocore.exceptions import ClientError
from app.config import get_settings
from app.models.schemas import VoiceCallRequest, VoiceCallResponse
from app.services.dynamodb import get_patient, get_assessments_by_patient
from app.utils.helpers import format_phone_e164

logger = logging.getLogger(__name__)

settings = get_settings()

router = APIRouter()


@router.post("/call", response_model=VoiceCallResponse)
async def trigger_voice_call(data: VoiceCallRequest):
    """
    Trigger a voice call to the patient via ElevenLabs.
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

    # ── Guard: return simulated response when ElevenLabs isn't configured ──
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        logger.warning("ElevenLabs credentials missing. Returning simulated response.")
        return VoiceCallResponse(
            conversation_id="simulated_no_credentials",
            patient_id=data.patient_id,
            status="simulated",
            message=script,
        )

    # ── Build ElevenLabs outbound call payload ──
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }

    formatted_phone = format_phone_e164(patient.get("phone", ""))
    language = patient.get("language_preference", "hi-IN")

    payload = {
        "number": formatted_phone,
        "language": language,
        "dynamic_variables": {
            "patient_name": patient.get("name", "there"),
            "healing_score": str(latest.get("healing_score", "N/A"))
            if latest
            else "N/A",
            "clinical_summary": latest.get("summary", "")
            if latest
            else "No recent photo uploaded.",
        },
        "system_prompt_override": (
            f"You are a medical assistant calling a patient post-surgery. "
            f"Speak in the language matching locale '{language}'. "
            f"Your script/goal for this call is: {script}"
        ),
    }

    try:
        url = f"https://api.elevenlabs.io/v1/convai/agents/{settings.elevenlabs_agent_id}/calls"
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        result = resp.json()

        return VoiceCallResponse(
            conversation_id=result.get("conversation_id", "unknown"),
            patient_id=data.patient_id,
            status="initiated",
            message=script,
        )
    except requests.exceptions.RequestException as e:
        logger.error(
            "ElevenLabs outbound call failed: %s | Response: %s",
            str(e),
            getattr(e.response, "text", ""),
        )
        raise HTTPException(
            status_code=502, detail="Failed to trigger voice call via ElevenLabs"
        )
