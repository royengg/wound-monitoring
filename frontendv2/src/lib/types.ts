export interface PatientCreate {
  name: string;
  age: number;
  gender?: string;
  phone: string;
  surgery_type: string;
  surgery_date: string;
  wound_location?: string;
  risk_factors?: string[];
  language_preference?: string;
}

export interface Patient extends PatientCreate {
  patient_id: string;
  created_at: string;
}

export interface PatientUpdate {
  name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  surgery_type?: string;
  surgery_date?: string;
  wound_location?: string;
  risk_factors?: string[];
  language_preference?: string;
}

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  confidence: number;
  label: string;
}

export interface YoloResult {
  detections: BoundingBox[];
  has_wound: boolean;
}

export interface PWATScores {
  size: number;
  depth: number;
  necrotic_tissue_type: number;
  necrotic_tissue_amount: number;
  granulation_tissue_type: number;
  granulation_tissue_amount: number;
  edges: number;
  periulcer_skin_viability: number;
  total_score?: number;
}

export interface AssessmentResult {
  assessment_id: string;
  patient_id: string;
  image_url: string;
  yolo_detections?: BoundingBox[];
  healing_score: number;
  pwat_scores?: PWATScores;
  infection_status?: string;
  tissue_types: string[];
  anomalies: string[];
  urgency_level: string; // 'low' | 'medium' | 'high'
  summary: string;
  recommendations: string[];
  voice_agent_script?: string;
  days_post_op?: number;
  created_at: string;
}

export interface VoiceCallRequest {
  patient_id: string;
}

export interface VoiceCallResponse {
  conversation_id: string;
  patient_id: string;
  status: string;
  message: string;
}
