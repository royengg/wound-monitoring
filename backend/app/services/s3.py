import logging
import boto3
from botocore.exceptions import ClientError
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
s3_client = boto3.client(
    "s3",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)


def upload_image(file_bytes: bytes, patient_id: str, filename: str) -> str:
    """Upload wound image to S3 and return the object key."""
    key = f"wounds/{patient_id}/{filename}"
    try:
        s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType="image/jpeg",
        )
        return key
    except ClientError as e:
        logger.error("S3 upload failed for %s: %s", key, e.response["Error"]["Message"])
        raise


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Generate and return a presigned GET URL for the given S3 key."""
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )
        return url
    except ClientError as e:
        logger.error(
            "Failed to generate presigned URL for %s: %s",
            key,
            e.response["Error"]["Message"],
        )
        raise


def download_image(key: str) -> bytes:
    """Download and return image bytes from S3."""
    try:
        resp = s3_client.get_object(Bucket=settings.s3_bucket_name, Key=key)
        return resp["Body"].read()
    except ClientError as e:
        logger.error(
            "S3 download failed for %s: %s", key, e.response["Error"]["Message"]
        )
        raise
