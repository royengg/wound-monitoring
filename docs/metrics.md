# ML Pipeline Metrics

## Dataset

| Property | Value |
|---|---|
| Source | Roboflow — `wound-ebsdw` v13 (workspace `w-afwxp`) |
| Original classes | 6 — classes 0-4 (wound types) + class 5 (no_abnormality) |
| Remapping | Classes 0-4 merged → single `wound` class; class 5 dropped (802 annotations) |
| Train images | 3,159 |
| Validation images | 300 (38 background / negative examples) |
| Test images | 150 |
| Total annotations kept | 4,236 (across classes 0-4) |
| Image format | JPEG, variable resolution, YOLO label format |

Class 5 (`no_abnormality`) was dropped because it consisted of bounding-box annotations around normal-looking skin regions. In object detection, training the model to localize "nothing abnormal" is counterproductive, the absence of a detection already signals no wound. Keeping class 5 boxes would confuse the localizer since there is no distinct visual object to learn from.

### Original class distribution (annotations)

| Class ID | Count |
|---|---|
| 0 | 950 |
| 1 | 229 |
| 2 | 996 |
| 3 | 1,384 |
| 4 | 677 |
| 5 (dropped) | 802 |

---

## Layer 1 — YOLOv8n Wound Detection

### Training configuration

| Parameter | Value |
|---|---|
| Base model | YOLOv8n (pretrained COCO weights) |
| Epochs | 50 (all completed, no early stopping triggered) |
| Image size | 640 x 640 |
| Batch size | 16 |
| Patience | 10 |
| Hardware | Kaggle — NVIDIA Tesla T4 (14,913 MiB) |
| Training time | 0.486 hours (~29 minutes) |
| Framework | Ultralytics 8.4.19, PyTorch 2.9.0+cu126, Python 3.12.12 |

### Model architecture

| Property | Value |
|---|---|
| Layers (fused) | 73 |
| Parameters | 3,005,843 |
| GFLOPs | 8.1 |
| Model file size | 6.2 MB |
| Output classes | 1 (`wound`) |

### Validation metrics (best checkpoint)

| Metric | Value |
|---|---|
| mAP@0.5 | 0.779 |
| mAP@0.5:0.95 | 0.424 |
| Precision | 0.770 |
| Recall | 0.718 |

### Final epoch metrics (epoch 50)

| Metric | Value |
|---|---|
| Box loss | 1.177 |
| Class loss | 0.847 |
| DFL loss | 1.547 |
| Precision | 0.770 |
| Recall | 0.719 |
| mAP@0.5 | 0.779 |
| mAP@0.5:0.95 | 0.425 |

### Inference speed

#### GPU — Kaggle Tesla T4

From Ultralytics validation output (300 images):

| Stage | Time |
|---|---|
| Preprocess | 0.2 ms |
| Inference | 2.0 ms |
| Postprocess | 3.7 ms |
| **Total** | **~6 ms** |

#### CPU — Benchmarked with `benchmark_yolo_cpu.py`

9 demo images, 5 runs each (45 samples total), after 3 warmup runs:

| Stage | Mean | Median | Std Dev | Min | Max |
|---|---|---|---|---|---|
| Preprocess | 2.0 ms | 1.9 ms | 0.2 ms | 1.8 ms | 2.5 ms |
| Inference | 447.7 ms | 446.9 ms | 10.8 ms | 423.9 ms | 479.4 ms |
| Postprocess | 1.4 ms | 1.3 ms | 0.6 ms | 0.6 ms | 2.7 ms |
| **Total** | **451.1 ms** | **449.7 ms** | **10.6 ms** | **426.8 ms** | **482.6 ms** |

Per-image breakdown (CPU, mean of 5 runs):

| Image | Pre (ms) | Inf (ms) | Post (ms) | Total (ms) | Det | Conf |
|---|---|---|---|---|---|---|
| demo_no_wound.jpg | 1.9 | 446.3 | 0.7 | 448.8 | 0 | — |
| demo_wound_1.jpg | 1.9 | 453.4 | 1.3 | 456.6 | 1 | 0.910 |
| demo_wound_2.jpg | 1.9 | 443.8 | 0.9 | 446.6 | 1 | 0.906 |
| demo_wound_3.jpg | 2.4 | 439.1 | 2.6 | 444.2 | 1 | 0.901 |
| demo_wound_4.jpg | 1.9 | 446.0 | 1.3 | 449.2 | 1 | 0.897 |
| demo_wound_5.jpg | 2.1 | 451.5 | 1.1 | 454.6 | 1 | 0.886 |
| demo_wound_6.jpg | 2.0 | 456.8 | 1.1 | 459.8 | 1 | 0.886 |
| demo_wound_7.jpg | 1.8 | 442.0 | 2.2 | 446.0 | 1 | 0.884 |
| demo_wound_8.jpg | 1.9 | 450.6 | 1.5 | 454.0 | 1 | 0.878 |

### Confidence threshold

| Setting | Value |
|---|---|
| Threshold | 0.25 (configurable via `YOLO_CONFIDENCE_THRESHOLD`) |
| Validation images with no detection at 0.25 | 41 / 300 (13.7%) |

---

## Layer 2 — Bedrock (Claude) Wound Assessment

### Configuration

| Parameter | Value |
|---|---|
| Model | Claude Sonnet 4 via APAC inference profile |
| Model ID | `apac.anthropic.claude-sonnet-4-20250514-v1:0` |
| Region | ap-south-1 |
| Temperature | 0.1 |
| Max tokens | 2,048 |
| Retry logic | 2 retries with exponential backoff |

### Output schema

Structured JSON with: `healing_score` (0-10), `pwat_scores` (8 sub-scores + total), `infection_status`, `tissue_types`, `anomalies`, `urgency_level`, `summary`, `recommendations`, `voice_agent_script`.

### All demo images — schema validation

All 9 images (8 wound + 1 no-wound) returned valid JSON with correct schema and field ranges.

| Image | Healing Score | PWAT Total | Urgency | Infection | Time |
|---|---|---|---|---|---|
| demo_wound_1.jpg | 8.5 | 5 | low | none | 7.0s |
| demo_wound_2.jpg | 8.5 | 5 | low | none | 6.2s |
| demo_wound_3.jpg | 4.2 | 12 | high | infection | 8.6s |
| demo_wound_4.jpg | 4.2 | 23 | high | both | 8.0s |
| demo_wound_5.jpg | 4.2 | 16 | high | infection | 7.7s |
| demo_wound_6.jpg | 7.5 | 9 | low | none | 6.3s |
| demo_wound_7.jpg | 4.2 | 11 | medium | infection | 8.9s |
| demo_wound_8.jpg | 8.5 | 4 | low | none | 7.3s |
| demo_no_wound.jpg | 9.2 | 0 | low | none | 8.8s |

### Consistency — same image x5

Image: `demo_wound_1.jpg`, 5 consecutive runs.

| Run | Healing Score | PWAT Total | Urgency | Time |
|---|---|---|---|---|
| 1 | 8.5 | 5 | low | 6.9s |
| 2 | 8.5 | 5 | low | 6.3s |
| 3 | 8.5 | 5 | low | 6.7s |
| 4 | 8.5 | 5 | low | 6.8s |
| 5 | 8.5 | 5 | low | 6.7s |

| Stat | Value |
|---|---|
| Mean healing_score | 8.50 |
| Std dev (σ) | **0.000** |
| Mean PWAT total | 5.00 |
| Urgency consistency | 5/5 low (unanimous) |
| Avg response time | 6.7s |

### Urgency escalation

Same wound image (`demo_wound_3.jpg`) with different patient contexts.

| Context | Healing Score | PWAT Total | Urgency | Infection |
|---|---|---|---|---|
| Normal (58yo, appendectomy, day 7) | 4.2 | 12 | high | infection |
| High-risk (72yo, colostomy, day 4, diabetes HbA1c 9.2, immunosuppressant, fever, discharge) | 2.5 | 23 | high | infection |

High-risk context lowered healing_score by 1.7 and increased PWAT by 11.

### Temporal coherence

Same wound image (`demo_wound_1.jpg`) with different score histories.

| Condition | Healing Score | PWAT Total | Urgency | Summary mentions trend |
|---|---|---|---|---|
| Improving history (3.0 → 4.0 → 5.5) | 6.5 | 7 | low | Yes (positive) |
| Worsening history (8.0 → 7.5 → 6.0) | 4.5 | 18 | high | Yes (negative) |
| No history (baseline) | 8.5 | 5 | low | N/A |

---

## End-to-End Pipeline

### Latency (full `/api/assessments/upload` request)

Includes: file read, S3 upload, YOLO inference (CPU), Bedrock API call, DynamoDB write, JSON response.

| Test | Total Time |
|---|---|
| demo_wound_1.jpg | 9.0s |
| demo_wound_3.jpg | 8.9s |
| demo_no_wound.jpg | 10.2s |

Breakdown estimate: S3 ~0.3s, YOLO ~0.5s (CPU), Bedrock ~6-9s, DynamoDB ~0.2s, overhead ~0.1s.