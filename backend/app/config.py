from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-south-1"

    s3_bucket_name: str = "wound-photos"

    dynamodb_patients_table: str = "patients"
    dynamodb_assessments_table: str = "assessments"

    bedrock_model_id: str = "anthropic.claude-sonnet-4-5-20250929-v1:0"

    yolo_model_path: str = "wound_yolov8n.pt"
    yolo_confidence_threshold: float = 0.25

    elevenlabs_api_key: str = ""
    elevenlabs_agent_id: str = ""

    sns_alert_topic_arn: str = ""

    debug: bool = True
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
