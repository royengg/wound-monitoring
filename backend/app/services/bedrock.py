import logging
import boto3
import json
import base64
import time
from botocore.exceptions import ClientError
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
bedrock_client = boto3.client(
    "bedrock-runtime",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)

SYSTEM_PROMPT = """You are a clinical wound assessment AI assistant. You analyze wound photographs alongside structured patient metadata to produce objective, reproducible wound assessments.

IMPORTANT RULES:
- Return ONLY valid JSON. No markdown fencing, no explanation text, no preamble.
- Never diagnose. You flag and score — clinicians diagnose.
- Be consistent: the same wound image with the same context should produce nearly identical scores.
- If the image quality is poor (blurry, dark, overexposed), note this in anomalies and reduce confidence but still provide your best assessment.

PWAT (Photographic Wound Assessment Tool) SCORING GUIDE:
Each sub-score uses a 0-4 scale (except periulcer_skin_viability which is 0-2). Lower scores = healthier wound.

- size: 0=healed/0cm², 1=<4cm², 2=4-16cm², 3=16-36cm², 4=>36cm²
- depth: 0=healed, 1=partial thickness, 2=full thickness, 3=deep (fascia visible), 4=deep (bone/tendon visible)
- necrotic_tissue_type: 0=none, 1=white/gray non-viable, 2=loosely adherent yellow slough, 3=adherent soft black eschar, 4=firmly adherent hard black eschar
- necrotic_tissue_amount: 0=none, 1=<25%, 2=25-50%, 3=50-75%, 4=>75%
- granulation_tissue_type: 0=skin intact/closed, 1=bright beefy red, 2=bright beefy red with some pale areas, 3=pink or pale red, 4=no granulation (dusky/non-viable)
- granulation_tissue_amount: 0=100% coverage, 1=75-100%, 2=25-75%, 3=<25%, 4=none
- edges: 0=indistinct/diffuse, 1=distinct but not attached, 2=well-defined not attached, 3=well-defined attached/rolled, 4=fibrotic/scarred
- periulcer_skin_viability: 0=intact/healthy, 1=fragile/discolored, 2=damaged/eroded

healing_score (0-10): Composite score where 10 = fully healed, 0 = critical/severe wound.
  Approximate mapping: total_pwat 0-4 → healing_score 8-10, 5-12 → 5-8, 13-20 → 3-5, 21-32 → 0-3.

Return this exact JSON structure:
{
  "healing_score": <float 0.0-10.0, one decimal place>,
  "pwat_scores": {
    "size": <int 0-4>,
    "depth": <int 0-4>,
    "necrotic_tissue_type": <int 0-4>,
    "necrotic_tissue_amount": <int 0-4>,
    "granulation_tissue_type": <int 0-4>,
    "granulation_tissue_amount": <int 0-4>,
    "edges": <int 0-4>,
    "periulcer_skin_viability": <int 0-2>,
    "total_score": <int, sum of above>
  },
  "infection_status": "<none|infection|ischemia|both>",
  "tissue_types": ["<one or more of: granulation, epithelialization, slough, necrosis, fibrin>"],
  "anomalies": ["<string descriptions of any abnormalities, empty array if none>"],
  "urgency_level": "<low|medium|high>",
  "summary": "<2-3 sentence clinical summary suitable for a clinician dashboard>",
  "recommendations": ["<3-5 actionable care recommendations>"],
  "voice_agent_script": "<conversational script (2-4 sentences) the voice agent reads to the patient — friendly, non-technical. MUST start with the patient's name (from context) and include their healing score.>"
}

URGENCY GUIDELINES:
- low: Wound healing normally. No signs of infection. PWAT total < 12.
- medium: Slow healing, mild concerns (increased redness, slight swelling, stalled progress). PWAT 12-20.
- high: Signs of infection (purulent discharge, expanding redness, fever-like warmth, necrosis), dehiscence, or deteriorating trend. PWAT > 20 or ANY infection sign."""


def assess_wound(
    image_bytes: bytes,
    patient_context: dict,
    previous_scores: list[dict] | None = None,
    wound_detected: bool = True,
) -> dict:
    """
    Send wound image + patient context to Bedrock Claude for assessment.
    Returns parsed JSON with healing_score, pwat_scores, tissue_types, etc.

    Args:
        image_bytes: Raw image bytes (cropped wound or full photo).
        patient_context: Dict with patient metadata (name, age, surgery_type, days_post_op, etc.).
        previous_scores: Optional list of past assessments, each containing
                         {"date", "healing_score", "days_post_op"}, newest first.
        wound_detected: Whether YOLO detected a wound. If False, the full uncropped
                        image is sent with an advisory note.
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    user_message = f"""Patient context:
- Name: {patient_context.get('name', 'Unknown')}
- Age: {patient_context.get('age', 'Unknown')}
- Surgery type: {patient_context.get('surgery_type', 'Unknown')}
- Days post-op: {patient_context.get('days_post_op', 'Unknown')}
- Wound location: {patient_context.get('wound_location', 'Unknown')}
- Risk factors: {', '.join(patient_context.get('risk_factors', [])) or 'None'}"""

    if not wound_detected:
        user_message += """

NOTE: The automated wound localization model did not detect a wound region in this image.
This may mean: (a) the wound is very small or well-healed, (b) the photo angle/lighting made detection difficult, or (c) there is genuinely no wound visible.
Please analyze the full image as best you can. If you cannot identify a wound, set healing_score to 9.0+ and note the detection gap in anomalies."""

    if previous_scores:
        history_lines = []
        for entry in previous_scores[:5]:
            history_lines.append(
                f"  Day {entry.get('days_post_op', '?')}: "
                f"score {entry.get('healing_score', '?')}/10 "
                f"({entry.get('date', 'unknown date')})"
            )
        user_message += "\n\nPrevious healing scores (newest first):\n" + "\n".join(history_lines)

    user_message += "\n\nPlease analyze the attached wound photograph and provide your structured assessment."

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2048,
        "temperature": 0.1,  # Low temperature for consistent, reproducible scores
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_message,
                    },
                ],
            }
        ],
    })

    # Invoke Bedrock with retry on transient errors
    max_retries = 2
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            t0 = time.time()
            response = bedrock_client.invoke_model(
                modelId=settings.bedrock_model_id,
                contentType="application/json",
                accept="application/json",
                body=body,
            )
            elapsed = time.time() - t0
            logger.info("Bedrock responded in %.2fs (attempt %d)", elapsed, attempt + 1)
            break
        except ClientError as e:
            error_code = e.response["Error"].get("Code", "")
            if error_code in ("ThrottlingException", "ServiceUnavailableException") and attempt < max_retries:
                wait = 2 ** attempt
                logger.warning("Bedrock %s, retrying in %ds...", error_code, wait)
                time.sleep(wait)
                last_error = e
                continue
            logger.error("Bedrock invocation failed: %s", e.response["Error"]["Message"])
            raise
        except Exception as e:
            logger.error("Unexpected error calling Bedrock: %s", str(e))
            raise
    else:
        raise last_error  # type: ignore[misc]

    # Extract text from response
    try:
        response_body = json.loads(response["body"].read())
        assistant_text = response_body["content"][0]["text"]
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        logger.error("Failed to extract text from Bedrock response: %s", str(e))
        raise ValueError(f"Invalid Bedrock response structure: {e}")

    # Parse the JSON response (strip any accidental markdown fencing)
    parsed = _parse_json_response(assistant_text)

    # Validate critical fields
    parsed = _validate_assessment(parsed)

    return parsed


def _parse_json_response(text: str) -> dict:
    """Parse JSON from Claude's response, handling markdown fencing and common issues."""
    cleaned = text.strip()

    # Strip markdown code fences
    if cleaned.startswith("```"):
        # Remove opening fence (may have language tag like ```json)
        cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].rstrip()
    # Handle case where closing ``` is on its own line
    if "\n```" in cleaned:
        cleaned = cleaned.rsplit("\n```", 1)[0]

    # Try parsing directly
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the text (Claude sometimes adds preamble)
    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(cleaned[start:end])
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse Bedrock JSON. Raw (first 500 chars): %.500s", text)
    raise ValueError(f"Bedrock model returned unparseable JSON")


def _validate_assessment(data: dict) -> dict:
    """Validate and fix common issues in the assessment JSON."""
    # Clamp healing_score to 0-10
    if "healing_score" in data:
        data["healing_score"] = round(max(0.0, min(10.0, float(data["healing_score"]))), 1)

    # Ensure urgency_level is valid
    valid_urgency = {"low", "medium", "high"}
    if data.get("urgency_level", "").lower() not in valid_urgency:
        data["urgency_level"] = "medium"
    else:
        data["urgency_level"] = data["urgency_level"].lower()

    # Ensure infection_status is valid
    valid_infection = {"none", "infection", "ischemia", "both"}
    if data.get("infection_status", "").lower() not in valid_infection:
        data["infection_status"] = "none"
    else:
        data["infection_status"] = data["infection_status"].lower()

    # Validate PWAT scores if present
    if "pwat_scores" in data and isinstance(data["pwat_scores"], dict):
        pwat = data["pwat_scores"]
        pwat_limits = {
            "size": 4, "depth": 4, "necrotic_tissue_type": 4,
            "necrotic_tissue_amount": 4, "granulation_tissue_type": 4,
            "granulation_tissue_amount": 4, "edges": 4,
            "periulcer_skin_viability": 2,
        }
        for field, max_val in pwat_limits.items():
            if field in pwat:
                pwat[field] = max(0, min(max_val, int(pwat[field])))
        # Recompute total
        pwat["total_score"] = sum(pwat.get(f, 0) for f in pwat_limits)

    # Ensure lists are lists
    for field in ["tissue_types", "anomalies", "recommendations"]:
        if field not in data or not isinstance(data[field], list):
            data[field] = []

    # Ensure strings
    for field in ["summary", "voice_agent_script"]:
        if field not in data or not isinstance(data[field], str):
            data[field] = ""

    return data
