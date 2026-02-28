from fastapi import APIRouter, HTTPException
from app.models.schemas import VoiceCallRequest, VoiceCallResponse
from app.services.dynamodb import get_patient, get_assessments_by_patient

router = APIRouter()


@router.post("/call", response_model=VoiceCallResponse)
async def trigger_voice_call(data: VoiceCallRequest):
    # TODO: get patient + latest assessment, trigger call via ElevenLabs
    pass
