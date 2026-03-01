from pydantic import BaseModel, Field
from typing import Optional


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: Optional[str] = None
    phone: str
    surgery_type: str
    surgery_date: str
    wound_location: Optional[str] = None
    risk_factors: Optional[list[str]] = None
    language_preference: Optional[str] = "hi-IN"


class Patient(BaseModel):
    patient_id: str
    name: str
    age: int
    gender: Optional[str] = None
    phone: str
    surgery_type: str
    surgery_date: str
    wound_location: Optional[str] = None
    risk_factors: Optional[list[str]] = None
    language_preference: Optional[str] = "hi-IN"
    created_at: str


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    surgery_type: Optional[str] = None
    surgery_date: Optional[str] = None
    wound_location: Optional[str] = None
    risk_factors: Optional[list[str]] = None
    language_preference: Optional[str] = None


class BoundingBox(BaseModel):
    """DFUC annotation format"""

    xmin: float
    ymin: float
    xmax: float
    ymax: float
    confidence: float
    label: str


class YoloResult(BaseModel):
    detections: list[BoundingBox] = []
    has_wound: bool = False


# PWAT: 8 sub-scores from WoundNet dataset, each 0-4 (skin_viability 0-2), total max 32
class PWATScores(BaseModel):
    size: int = Field(0, ge=0, le=4)
    depth: int = Field(0, ge=0, le=4)
    necrotic_tissue_type: int = Field(0, ge=0, le=4)
    necrotic_tissue_amount: int = Field(0, ge=0, le=4)
    granulation_tissue_type: int = Field(0, ge=0, le=4)
    granulation_tissue_amount: int = Field(0, ge=0, le=4)
    edges: int = Field(0, ge=0, le=4)
    periulcer_skin_viability: int = Field(0, ge=0, le=2)
    total_score: Optional[int] = None


class AssessmentResult(BaseModel):
    assessment_id: str
    patient_id: str
    image_url: str

    yolo_detections: Optional[list[BoundingBox]] = None

    healing_score: float = Field(0, ge=0, le=10)
    pwat_scores: Optional[PWATScores] = None
    infection_status: Optional[str] = None  # none | infection | ischemia | both
    tissue_types: list[
        str
    ] = []  # granulation, epithelialization, slough, necrosis, fibrin
    anomalies: list[str] = []
    urgency_level: str = "low"  # low | medium | high
    summary: str = ""
    recommendations: list[str] = []
    voice_agent_script: Optional[str] = None
    days_post_op: Optional[int] = None
    created_at: str = ""


class VoiceCallRequest(BaseModel):
    patient_id: str


class VoiceCallResponse(BaseModel):
    conversation_id: str
    patient_id: str
    status: str = "initiated"
    message: str = ""
