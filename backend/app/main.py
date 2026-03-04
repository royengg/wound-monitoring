from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import patients, assessments, voice

settings = get_settings()
root = settings.app_root.rstrip("/")

app = FastAPI(
    title="API",
    description="AI-powered post-discharge wound monitoring system",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix=f"{root}/api/patients", tags=["Patients"])
app.include_router(assessments.router, prefix=f"{root}/api/assessments", tags=["Assessments"])
app.include_router(voice.router, prefix=f"{root}/api/voice", tags=["Voice Agent"])


@app.get(f"{root}/api/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "api"}


@app.get(f"{root}/", tags=["Health"])
async def root_check():
    return {"message": "API is running. Visit /docs for API documentation."}
