# AI Post-Discharge Wound Monitoring

> AI-powered wound monitoring with YOLOv8 + Amazon Bedrock + Voice Agent

### Prerequisites

- Node.js 18+ & npm
- Python 3.10+
- AWS account (Bedrock, S3, DynamoDB access)

## AWS Setup

- Create S3 bucket: `wound-photos`
- Create DynamoDB tables: `patients` (PK: `patient_id`), `assessments` (PK: `assessment_id`)
- Fill `.env` with all credentials

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

### Backend (FastAPI)

```bash
cd backend
source venv/bin/activate   # activate virtualenv
uvicorn app.main:app --reload  # → http://localhost:8000/docs
```

## Project Structure

```
├── frontend/            # React (Vite) — mobile-styled web app
│   └── src/
│       ├── pages/       # PatientHome, PhotoUpload, HealingTimeline, Dashboard
│       ├── components/  # Layout (bottom nav shell)
│       └── services/    # api.js (axios helpers)
│
├── backend/             # Python FastAPI
│   └── app/
│       ├── routers/     # patients.py, assessments.py, voice.py
│       ├── services/    # s3.py, dynamodb.py, bedrock.py, yolo.py
│       ├── models/      # schemas.py (Pydantic models)
│       └── config.py    # env-based settings
│
├── docs/                # references
```
