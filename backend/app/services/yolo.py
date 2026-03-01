import logging
from ultralytics import YOLO
from PIL import Image
from io import BytesIO
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
_model = None


def get_model() -> YOLO:
    global _model
    if _model is None:
        try:
            _model = YOLO(settings.yolo_model_path)
            logger.info("YOLO model loaded from %s", settings.yolo_model_path)
        except Exception as e:
            logger.error(
                "Failed to load YOLO model from %s: %s",
                settings.yolo_model_path,
                str(e),
            )
            raise RuntimeError(f"YOLO model failed to load: {e}")
    return _model


def detect_wound(image_bytes: bytes) -> dict:
    """
    Run YOLO inference on image bytes.
    Returns: { detections: [BoundingBox], cropped_image_bytes: bytes|None, has_wound: bool }

    Uses confidence threshold from settings (YOLO_CONFIDENCE_THRESHOLD env var).
    When no wound is detected, returns has_wound=False with no crop.
    """
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.error("Failed to open image for YOLO detection: %s", str(e))
        raise ValueError(f"Invalid image data: {e}")

    conf_threshold = settings.yolo_confidence_threshold

    try:
        model = get_model()
        results = model(image, verbose=False, conf=conf_threshold)
    except RuntimeError:
        raise
    except Exception as e:
        logger.error("YOLO inference failed: %s", str(e))
        raise RuntimeError(f"Wound detection failed: {e}")

    detections = []
    best_box = None
    best_conf = 0.0

    for result in results:
        for box in result.boxes:
            coords = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            label = result.names[int(box.cls[0])]
            det = {
                "xmin": coords[0],
                "ymin": coords[1],
                "xmax": coords[2],
                "ymax": coords[3],
                "confidence": round(conf, 4),
                "label": label,
            }
            detections.append(det)
            if conf > best_conf:
                best_conf = conf
                best_box = coords

    logger.info(
        "YOLO detection: %d wound(s) found (conf_threshold=%.2f, best_conf=%.3f)",
        len(detections),
        conf_threshold,
        best_conf,
    )

    # Crop the highest-confidence detection with 10% padding
    cropped_bytes = None
    if best_box:
        w, h = image.size
        pad_x = (best_box[2] - best_box[0]) * 0.10
        pad_y = (best_box[3] - best_box[1]) * 0.10
        crop_box = (
            max(0, best_box[0] - pad_x),
            max(0, best_box[1] - pad_y),
            min(w, best_box[2] + pad_x),
            min(h, best_box[3] + pad_y),
        )
        cropped = image.crop(crop_box)
        buf = BytesIO()
        cropped.save(buf, format="JPEG", quality=90)
        cropped_bytes = buf.getvalue()
        logger.info(
            "Wound cropped: %dx%d (%.1f%% of original %dx%d)",
            int(crop_box[2] - crop_box[0]),
            int(crop_box[3] - crop_box[1]),
            (cropped.size[0] * cropped.size[1]) / (w * h) * 100,
            w,
            h,
        )

    return {
        "detections": detections,
        "cropped_image_bytes": cropped_bytes,
        "has_wound": len(detections) > 0,
    }
