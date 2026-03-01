#!/usr/bin/env python3
"""
YOLO CPU Inference Benchmark
==============================
Measures preprocess, inference, and postprocess times on CPU
across all demo images. Run from backend/ directory:

    python3 benchmark_yolo_cpu.py
"""

import os
import sys
import time
import statistics
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image
from io import BytesIO
from ultralytics import YOLO
from app.config import get_settings

settings = get_settings()
DEMO_DIR = Path(__file__).parent / "demo_images"
MODEL_PATH = settings.yolo_model_path
CONF_THRESHOLD = settings.yolo_confidence_threshold
WARMUP_RUNS = 3
BENCHMARK_RUNS = 5


def benchmark():
    print(f"Model: {MODEL_PATH}")
    print(f"Confidence threshold: {CONF_THRESHOLD}")
    print(f"Device: CPU")
    print(f"Warmup runs: {WARMUP_RUNS}, Benchmark runs per image: {BENCHMARK_RUNS}")
    print()

    # Load model
    t0 = time.perf_counter()
    model = YOLO(MODEL_PATH)
    load_time = (time.perf_counter() - t0) * 1000
    print(f"Model load time: {load_time:.0f} ms")

    images = sorted(DEMO_DIR.glob("*.jpg"))
    if not images:
        print(f"No images found in {DEMO_DIR}")
        return

    # Warmup (first few runs are always slower due to framework init)
    print(f"\nWarming up ({WARMUP_RUNS} runs on first image)...")
    warmup_img = Image.open(images[0]).convert("RGB")
    for _ in range(WARMUP_RUNS):
        model(warmup_img, verbose=False, conf=CONF_THRESHOLD, device="cpu")

    # Benchmark each image
    all_preprocess = []
    all_inference = []
    all_postprocess = []
    all_total = []

    print(f"\nBenchmarking {len(images)} images x {BENCHMARK_RUNS} runs each...\n")
    print(f"{'Image':<25} {'Pre (ms)':>9} {'Inf (ms)':>9} {'Post (ms)':>10} {'Total (ms)':>11}  {'Det':>4} {'Conf':>6}")
    print("-" * 85)

    for img_path in images:
        img_pre_times = []
        img_inf_times = []
        img_post_times = []
        img_total_times = []
        last_result = None

        for _ in range(BENCHMARK_RUNS):
            raw_bytes = img_path.read_bytes()

            # Preprocess: bytes → PIL → RGB
            t_pre_start = time.perf_counter()
            pil_img = Image.open(BytesIO(raw_bytes)).convert("RGB")
            t_pre_end = time.perf_counter()

            # Inference
            t_inf_start = time.perf_counter()
            results = model(pil_img, verbose=False, conf=CONF_THRESHOLD, device="cpu")
            t_inf_end = time.perf_counter()

            # Postprocess: extract detections + crop best box
            t_post_start = time.perf_counter()
            best_box = None
            best_conf = 0.0
            n_det = 0
            for result in results:
                for box in result.boxes:
                    n_det += 1
                    coords = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    if conf > best_conf:
                        best_conf = conf
                        best_box = coords

            if best_box:
                w, h = pil_img.size
                pad_x = (best_box[2] - best_box[0]) * 0.10
                pad_y = (best_box[3] - best_box[1]) * 0.10
                crop_box = (
                    max(0, best_box[0] - pad_x),
                    max(0, best_box[1] - pad_y),
                    min(w, best_box[2] + pad_x),
                    min(h, best_box[3] + pad_y),
                )
                cropped = pil_img.crop(crop_box)
                buf = BytesIO()
                cropped.save(buf, format="JPEG", quality=90)
                _ = buf.getvalue()
            t_post_end = time.perf_counter()

            pre_ms = (t_pre_end - t_pre_start) * 1000
            inf_ms = (t_inf_end - t_inf_start) * 1000
            post_ms = (t_post_end - t_post_start) * 1000
            total_ms = pre_ms + inf_ms + post_ms

            img_pre_times.append(pre_ms)
            img_inf_times.append(inf_ms)
            img_post_times.append(post_ms)
            img_total_times.append(total_ms)
            last_result = (n_det, best_conf)

        mean_pre = statistics.mean(img_pre_times)
        mean_inf = statistics.mean(img_inf_times)
        mean_post = statistics.mean(img_post_times)
        mean_total = statistics.mean(img_total_times)

        all_preprocess.extend(img_pre_times)
        all_inference.extend(img_inf_times)
        all_postprocess.extend(img_post_times)
        all_total.extend(img_total_times)

        n_det, conf = last_result
        conf_str = f"{conf:.3f}" if conf > 0 else "—"
        print(f"{img_path.name:<25} {mean_pre:>8.1f} {mean_inf:>9.1f} {mean_post:>10.1f} {mean_total:>11.1f}  {n_det:>4} {conf_str:>6}")

    # Summary
    print("-" * 85)
    print(f"\nAggregate ({len(images)} images x {BENCHMARK_RUNS} runs = {len(all_total)} samples):\n")

    def stat_line(label, values):
        mn = statistics.mean(values)
        sd = statistics.stdev(values) if len(values) > 1 else 0
        lo = min(values)
        hi = max(values)
        med = statistics.median(values)
        print(f"  {label:<14} mean={mn:>7.1f} ms   median={med:>7.1f} ms   σ={sd:>5.1f} ms   min={lo:>7.1f}   max={hi:>7.1f}")

    stat_line("Preprocess", all_preprocess)
    stat_line("Inference", all_inference)
    stat_line("Postprocess", all_postprocess)
    stat_line("Total", all_total)


if __name__ == "__main__":
    benchmark()
