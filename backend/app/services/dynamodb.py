import logging
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
dynamodb = boto3.resource(
    "dynamodb",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)
patients_table = dynamodb.Table(settings.dynamodb_patients_table)
assessments_table = dynamodb.Table(settings.dynamodb_assessments_table)


# ── Patients ──────────────────────────────────────────


def put_patient(patient: dict) -> dict:
    try:
        patients_table.put_item(Item=patient)
        return patient
    except ClientError as e:
        logger.error(
            "Failed to create patient %s: %s",
            patient.get("patient_id"),
            e.response["Error"]["Message"],
        )
        raise


def get_patient(patient_id: str) -> dict | None:
    try:
        resp = patients_table.get_item(Key={"patient_id": patient_id})
        return resp.get("Item")
    except ClientError as e:
        logger.error(
            "Failed to get patient %s: %s", patient_id, e.response["Error"]["Message"]
        )
        raise


def get_all_patients() -> list[dict]:
    try:
        resp = patients_table.scan()
        items = resp.get("Items", [])
        while "LastEvaluatedKey" in resp:
            resp = patients_table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
            items.extend(resp.get("Items", []))
        return items
    except ClientError as e:
        logger.error("Failed to scan patients: %s", e.response["Error"]["Message"])
        raise


def update_patient(patient_id: str, updates: dict) -> dict:
    expr_parts = []
    expr_names = {}
    expr_values = {}
    for i, (key, value) in enumerate(updates.items()):
        alias = f"#k{i}"
        placeholder = f":v{i}"
        expr_parts.append(f"{alias} = {placeholder}")
        expr_names[alias] = key
        expr_values[placeholder] = value

    try:
        resp = patients_table.update_item(
            Key={"patient_id": patient_id},
            UpdateExpression="SET " + ", ".join(expr_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues="ALL_NEW",
        )
        return resp["Attributes"]
    except ClientError as e:
        logger.error(
            "Failed to update patient %s: %s",
            patient_id,
            e.response["Error"]["Message"],
        )
        raise


def delete_patient(patient_id: str) -> None:
    try:
        patients_table.delete_item(Key={"patient_id": patient_id})
    except ClientError as e:
        logger.error(
            "Failed to delete patient %s: %s",
            patient_id,
            e.response["Error"]["Message"],
        )
        raise


# ── Assessments ───────────────────────────────────────


def put_assessment(assessment: dict) -> dict:
    try:
        assessments_table.put_item(Item=assessment)
        return assessment
    except ClientError as e:
        logger.error(
            "Failed to create assessment %s: %s",
            assessment.get("assessment_id"),
            e.response["Error"]["Message"],
        )
        raise


def get_assessments_by_patient(patient_id: str) -> list[dict]:
    # Uses scan + filter (works at hackathon scale).
    # For production, add a GSI on patient_id and switch to query().
    try:
        resp = assessments_table.scan(
            FilterExpression=Attr("patient_id").eq(patient_id),
        )
        items = resp.get("Items", [])
        while "LastEvaluatedKey" in resp:
            resp = assessments_table.scan(
                FilterExpression=Attr("patient_id").eq(patient_id),
                ExclusiveStartKey=resp["LastEvaluatedKey"],
            )
            items.extend(resp.get("Items", []))
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items
    except ClientError as e:
        logger.error(
            "Failed to get assessments for patient %s: %s",
            patient_id,
            e.response["Error"]["Message"],
        )
        raise


def get_assessment(assessment_id: str) -> dict | None:
    try:
        resp = assessments_table.get_item(Key={"assessment_id": assessment_id})
        return resp.get("Item")
    except ClientError as e:
        logger.error(
            "Failed to get assessment %s: %s",
            assessment_id,
            e.response["Error"]["Message"],
        )
        raise


def delete_assessment(assessment_id: str) -> None:
    try:
        assessments_table.delete_item(Key={"assessment_id": assessment_id})
    except ClientError as e:
        logger.error(
            "Failed to delete assessment %s: %s",
            assessment_id,
            e.response["Error"]["Message"],
        )
        raise
