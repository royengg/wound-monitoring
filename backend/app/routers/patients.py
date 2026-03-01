import logging
from fastapi import APIRouter, HTTPException
from botocore.exceptions import ClientError
from datetime import datetime
import uuid
from app.models.schemas import PatientCreate, Patient, PatientUpdate
from app.services.dynamodb import (
    put_patient,
    get_patient,
    get_all_patients,
    update_patient,
    delete_patient,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=Patient, status_code=201)
async def create_patient(data: PatientCreate):
    patient = {
        "patient_id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.utcnow().isoformat(),
    }
    try:
        put_patient(patient)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while creating patient"
        )
    return patient


@router.get("")
async def list_patients():
    try:
        return get_all_patients()
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while listing patients"
        )


@router.get("/{patient_id}", response_model=Patient)
async def get_patient_by_id(patient_id: str):
    try:
        patient = get_patient(patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching patient"
        )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=Patient)
async def update_patient_by_id(patient_id: str, data: PatientUpdate):
    try:
        existing = get_patient(patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching patient"
        )
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")

    updates = data.model_dump(exclude_none=True)
    if not updates:
        return existing

    try:
        updated = update_patient(patient_id, updates)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while updating patient"
        )
    return updated


@router.delete("/{patient_id}", status_code=204)
async def delete_patient_by_id(patient_id: str):
    try:
        existing = get_patient(patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while fetching patient"
        )
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")
    try:
        delete_patient(patient_id)
    except ClientError:
        raise HTTPException(
            status_code=502, detail="Database error while deleting patient"
        )
