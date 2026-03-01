import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from botocore.exceptions import ClientError
from datetime import datetime
import uuid
from decimal import Decimal
from app.models.schemas import AssessmentResult, YoloResult, PWATScores
from app.services.s3 import upload_image, get_presigned_url
from app.services.yolo import detect_wound
from app.services.bedrock import assess_wound
from app.services.dynamodb import (
    put_assessment,
    get_assessments_by_patient,
    get_assessment,
    get_patient,
    delete_assessment,
)
from app.services.sns import publish_urgency_alert
from app.utils.helpers import days_since

logger = logging.getLogger(__name__)

router = APIRouter()


def _float_to_decimal(obj):
    """Recursively convert floats to Decimals for DynamoDB compatibility."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _float_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_float_to_decimal(i) for i in obj]
    return obj


def _decimal_to_float(obj):
    """Recursively convert Decimals back to floats for JSON response."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _decimal_to_float(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decimal_to_float(i) for i in obj]
    return obj


@router.post("/upload", response_model=AssessmentResult)
async def upload_and_assess(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
):
    # 1. Validate patient exists
    try:
        patient = get_patient(patient_id)
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while fetching patient")
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error("Failed to read uploaded file: %s", str(e))
        raise HTTPException(status_code=400, detail="Failed to read uploaded file")

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # 3. Upload original image to S3
    try:
        s3_key = upload_image(file_bytes, patient_id, file.filename)
        image_url = get_presigned_url(s3_key)
    except ClientError:
        raise HTTPException(status_code=502, detail="Failed to upload image to storage")

    # 4. Run YOLO wound detection
    try:
        yolo_result = detect_wound(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("YOLO detection error: %s", str(e))
        raise HTTPException(status_code=503, detail="Wound detection service unavailable")

    # 5. Gather previous assessment scores for trend analysis
    previous_scores = []
    try:
        past_assessments = get_assessments_by_patient(patient_id)
        for past in past_assessments[:5]:  # 5 most recent, already sorted newest-first
            previous_scores.append({
                "date": past.get("created_at", ""),
                "healing_score": float(past.get("healing_score", 0)),
                "days_post_op": int(past.get("days_post_op", 0)),
            })
    except ClientError:
        logger.warning("Could not fetch previous assessments for trend context — continuing without")

    # 6. Send to Bedrock for assessment
    wound_detected = yolo_result.get("has_wound", False) if yolo_result else False
    assessment_image = (
        yolo_result.get("cropped_image_bytes", file_bytes)
        if wound_detected
        else file_bytes
    )

    patient_context = {
        "patient_id": patient_id,
        "name": patient.get("name"),
        "age": int(patient.get("age", 0)),
        "surgery_type": patient.get("surgery_type"),
        "surgery_date": patient.get("surgery_date"),
        "wound_location": patient.get("wound_location"),
        "risk_factors": patient.get("risk_factors", []),
        "days_post_op": days_since(patient.get("surgery_date", datetime.utcnow().date().isoformat())),
    }

    try:
        bedrock_result = assess_wound(
            assessment_image,
            patient_context,
            previous_scores=previous_scores or None,
            wound_detected=wound_detected,
        )
    except ClientError:
        raise HTTPException(status_code=502, detail="AI assessment service error")
    except ValueError as e:
        logger.error("Bedrock response parsing error: %s", str(e))
        raise HTTPException(status_code=502, detail="AI assessment returned invalid data")

    # 7. Build assessment record
    assessment_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    assessment = {
        "assessment_id": assessment_id,
        "patient_id": patient_id,
        "image_url": image_url,
        "yolo_detections": yolo_result.get("detections", []) if yolo_result else [],
        "healing_score": bedrock_result.get("healing_score", 0),
        "pwat_scores": bedrock_result.get("pwat_scores"),
        "infection_status": bedrock_result.get("infection_status", "none"),
        "tissue_types": bedrock_result.get("tissue_types", []),
        "anomalies": bedrock_result.get("anomalies", []),
        "urgency_level": bedrock_result.get("urgency_level", "low"),
        "summary": bedrock_result.get("summary", ""),
        "recommendations": bedrock_result.get("recommendations", []),
        "voice_agent_script": bedrock_result.get("voice_agent_script", ""),
        "days_post_op": patient_context["days_post_op"],
        "created_at": now,
    }

    # 8. Store in DynamoDB
    try:
        put_assessment(_float_to_decimal(assessment))
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while saving assessment")

    # 9. Alert clinician via SNS if urgency is high
    if assessment["urgency_level"] == "high":
        publish_urgency_alert(patient, assessment)

    return assessment


@router.get("/{patient_id}")
async def get_patient_assessments(patient_id: str):
    try:
        items = get_assessments_by_patient(patient_id)
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while fetching assessments")
    return [_decimal_to_float(item) for item in items]


@router.get("/detail/{assessment_id}", response_model=AssessmentResult)
async def get_assessment_detail(assessment_id: str):
    try:
        assessment = get_assessment(assessment_id)
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while fetching assessment")
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return _decimal_to_float(assessment)


@router.delete("/detail/{assessment_id}", status_code=204)
async def delete_assessment_by_id(assessment_id: str):
    try:
        existing = get_assessment(assessment_id)
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while fetching assessment")
    if not existing:
        raise HTTPException(status_code=404, detail="Assessment not found")
    try:
        delete_assessment(assessment_id)
    except ClientError:
        raise HTTPException(status_code=502, detail="Database error while deleting assessment")
