# AI Post-Discharge Wound Monitoring

AI-powered post-discharge wound monitoring system using a two-layer ML pipeline:
YOLOv8 for wound detection/cropping and Claude (AWS Bedrock) for clinical wound assessment,
with a voice agent for patient follow-up calls.

## How It Works

1. Patient uploads a smartphone wound photo via the web app
2. **Layer 1 (YOLOv8)** detects and crops the wound region from the photo
3. **Layer 2 (Claude via Bedrock)** analyzes the cropped image + patient context to produce a structured assessment — healing score, PWAT sub-scores, infection status, urgency level, recommendations, and a voice agent script
4. Results are stored in DynamoDB and displayed on the patient dashboard
5. High-urgency cases trigger SNS alerts to clinicians
6. A voice agent (ElevenLabs) can call the patient with a personalized update

## Key Metrics

| Metric | Value |
|---|---|
| YOLO mAP@0.5 | 0.779 |
| YOLO Precision / Recall | 0.770 / 0.718 |
| YOLO CPU inference | ~451 ms |
| Bedrock response time | 6-9s |
| Bedrock consistency (σ) | 0.000 across 5 runs |
| E2E pipeline latency | ~9s |
| Model size | 6.2 MB |

Full metrics, dataset details, benchmark results, and test outcomes in [`docs/metrics.md`](docs/metrics.md).

## Prerequisites

- Python 3.10+
- Node.js 18+ & npm
- AWS account with access to S3, DynamoDB, and Bedrock (Claude Sonnet enabled)
- (Optional) ElevenLabs API key for voice agent

## Setup

### AWS Resources

1. **S3** — Create bucket: `wound-photos`
2. **DynamoDB** — Create two tables:
   - `patients` (partition key: `patient_id`, type String)
   - `assessments` (partition key: `assessment_id`, type String)
3. **Bedrock** — Enable Claude Sonnet model access in your region
4. (Optional) **SNS** — Create a topic for clinician urgency alerts
5. Copy `backend/.env.example` to `backend/.env` and fill in credentials

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
# API docs → http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/patients` | Create patient |
| `GET` | `/api/patients` | List all patients |
| `GET` | `/api/patients/{id}` | Get patient by ID |
| `PUT` | `/api/patients/{id}` | Update patient |
| `DELETE` | `/api/patients/{id}` | Delete patient |
| `POST` | `/api/assessments/upload` | Upload wound photo and get AI assessment |
| `GET` | `/api/assessments/{patient_id}` | List assessments for patient |
| `GET` | `/api/assessments/detail/{id}` | Get single assessment |
| `DELETE` | `/api/assessments/detail/{id}` | Delete assessment |
| `POST` | `/api/voice/call` | Trigger voice call to patient |

## Configuration

Environment variables in `backend/.env`:

| Variable | Description | Default |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS credentials | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | — |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `S3_BUCKET_NAME` | S3 bucket for wound photos | `wound-photos` |
| `DYNAMODB_PATIENTS_TABLE` | DynamoDB patients table | `patients` |
| `DYNAMODB_ASSESSMENTS_TABLE` | DynamoDB assessments table | `assessments` |
| `BEDROCK_MODEL_ID` | Bedrock model / inference profile | `apac.anthropic.claude-sonnet-4-20250514-v1:0` |
| `YOLO_MODEL_PATH` | Path to trained YOLO weights | `wound_yolov8n.pt` |
| `YOLO_CONFIDENCE_THRESHOLD` | Detection confidence threshold | `0.25` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (optional) | — |
| `ELEVENLABS_AGENT_ID` | ElevenLabs agent ID (optional) | — |
| `SNS_ALERT_TOPIC_ARN` | SNS topic for alerts (optional) | — |

## Project Structure

```
frontend/                    React (Vite) — mobile-styled web app
  src/
    pages/                   PatientHome, PhotoUpload, HealingTimeline, Dashboard
    components/              Layout (bottom nav shell)
    services/                api.ts (axios helpers)

backend/                     Python FastAPI
  app/
    main.py                  FastAPI app, CORS, router registration
    config.py                Pydantic settings (env-based)
    routers/                 patients.py, assessments.py, voice.py
    services/                yolo.py, bedrock.py, s3.py, dynamodb.py, sns.py
    models/                  schemas.py (Pydantic request/response models)
    utils/                   helpers.py (date math, phone formatting)
  wound_yolov8n.pt           Trained YOLO model weights (6.2 MB)
  demo_images/               8 curated wound images + 1 no-wound image
  benchmark_yolo_cpu.py      CPU inference speed benchmark

ml/
  wound-monitoring.ipynb     YOLOv8 training notebook (Kaggle T4)

docs/
  metrics.md                 Full ML pipeline metrics and test results
```

## ML Pipeline

### Layer 1 — YOLOv8n Wound Detection

- Trained on Roboflow `wound-ebsdw` v13 dataset (3,159 train / 300 val / 150 test images)
- Original 6 classes remapped to single `wound` class
- 50 epochs, 640px, batch 16 on Kaggle T4 (~29 min training)
- mAP@0.5: 0.779 | Precision: 0.770 | Recall: 0.718
- CPU inference: ~451 ms mean | GPU inference: ~6 ms

### Layer 2 — Claude (Bedrock) Wound Assessment

- Claude Sonnet 4 via AWS Bedrock APAC inference profile
- Produces structured JSON: healing score (0-10), 8 PWAT sub-scores, infection status, urgency level, tissue types, anomalies, clinical summary, care recommendations, voice agent script
- Temperature 0.1 for reproducible scoring — σ = 0.000 across 5 identical runs
- Context-aware: responds to patient risk factors and score history trends
- Response time: 6-9 seconds
