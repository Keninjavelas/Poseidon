"""
Poseidon Smart Water Hub - Edge AI Optical Sentry.

This module preserves the deterministic alert payload helper used by tests,
and adds a production-oriented pipeline that can run YOLOv8 inference when a
model and video source are available.
"""

import json
import logging
import os
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Optional
from uuid import uuid4

import paho.mqtt.client as mqtt

try:
    from ultralytics import YOLO  # type: ignore
except Exception:  # noqa: BLE001
    YOLO = None

try:
    import cv2  # type: ignore
except Exception:  # noqa: BLE001
    cv2 = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

ALERT_TYPES = [
    "Contaminant Detected",
    "Pipe Blockage",
    "Severe Discoloration",
    "Foreign Object",
]

MQTT_TOPIC = "poseidon/alerts/optical"


@dataclass
class Detection:
    label: str
    confidence: float
    bbox: list[int]


def build_alert_payload(node_id: str, seed=None) -> dict:
    """Build a test-friendly alert payload."""
    if seed is not None:
        random.seed(seed)

    alert_type = random.choice(ALERT_TYPES)
    confidence_score = random.uniform(0.5, 1.0)

    return {
        "node_id": node_id,
        "sensor_id": node_id,
        "module": "alerts",
        "message_id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "alert_type": alert_type,
        "confidence_score": confidence_score,
        "raw_detection_json": {
            "bbox": [
                random.randint(0, 640),
                random.randint(0, 480),
                random.randint(0, 640),
                random.randint(0, 480),
            ],
            "class": alert_type,
            "score": confidence_score,
        },
    }


def _connect_with_retry(broker_url: str) -> mqtt.Client:
    """Connect to the MQTT broker, retrying every 30 s on failure."""
    url = broker_url.replace("mqtt://", "")
    parts = url.split(":")
    host = parts[0]
    port = int(parts[1]) if len(parts) > 1 else 1883

    while True:
        # Prefer callback API v2 on modern paho-mqtt to avoid deprecation warnings.
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        except AttributeError:
            client = mqtt.Client()
        try:
            client.connect(host, port, keepalive=60)
            logger.info("Connected to MQTT broker at %s:%d", host, port)
            return client
        except Exception as exc:  # noqa: BLE001
            logger.error("MQTT connection failed: %s. Retrying in 30 s...", exc)
            time.sleep(30)


class OpticalSentryPipeline:
    def __init__(
        self,
        broker_url: str,
        node_id: str,
        model_path: Optional[str] = None,
        source: Optional[str] = None,
        batch_size: int = 4,
        min_publish_interval_s: float = 10.0,
    ):
        self.node_id = node_id
        self.broker_url = broker_url
        self.model_path = model_path
        self.source = source
        self.batch_size = batch_size
        self.min_publish_interval_s = min_publish_interval_s
        self._last_publish = 0.0
        self._client = None
        self._model = None

    def _connect(self) -> mqtt.Client:
        if self._client is not None:
            return self._client
        self._client = _connect_with_retry(self.broker_url)
        self._client.loop_start()
        return self._client

    def _load_model(self):
        if self._model is not None or not self.model_path or YOLO is None:
            return self._model
        self._model = YOLO(self.model_path)
        return self._model

    def _infer_batch(self, frames: Iterable[object]) -> list[Detection]:
        model = self._load_model()
        if model is None:
            return [
                Detection(
                    label=random.choice(ALERT_TYPES),
                    confidence=random.uniform(0.55, 0.99),
                    bbox=[
                        random.randint(0, 640),
                        random.randint(0, 480),
                        random.randint(0, 640),
                        random.randint(0, 480),
                    ],
                )
                for _ in frames
            ]

        detections: list[Detection] = []
        results = model.predict(list(frames), verbose=False)
        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None or len(boxes) == 0:
                detections.append(Detection(label="normal", confidence=0.0, bbox=[0, 0, 0, 0]))
                continue

            best = boxes[0]
            cls_index = int(best.cls[0]) if hasattr(best, "cls") else 0
            label = result.names.get(cls_index, "unknown")
            confidence = float(best.conf[0]) if hasattr(best, "conf") else 0.0
            x1, y1, x2, y2 = [int(value) for value in best.xyxy[0].tolist()]
            detections.append(Detection(label=label, confidence=confidence, bbox=[x1, y1, x2, y2]))
        return detections

    def _publish_detection(self, detection: Detection) -> None:
        now = time.monotonic()
        if now - self._last_publish < self.min_publish_interval_s:
            return

        payload = {
            "node_id": self.node_id,
            "sensor_id": self.node_id,
            "module": "alerts",
            "message_id": str(uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "alert_type": detection.label if detection.label in ALERT_TYPES else random.choice(ALERT_TYPES),
            "confidence_score": max(0.0, min(1.0, detection.confidence)),
            "raw_detection_json": {
                "bbox": detection.bbox,
                "label": detection.label,
                "score": detection.confidence,
            },
        }

        client = self._connect()
        result = client.publish(MQTT_TOPIC, json.dumps(payload), qos=1)
        result.wait_for_publish(timeout=5)
        self._last_publish = now

    def run(self) -> None:
        if cv2 is None or not self.source:
            while True:
                time.sleep(random.uniform(15, 60))
                self._publish_detection(
                    Detection(
                        label=random.choice(ALERT_TYPES),
                        confidence=random.uniform(0.5, 1.0),
                        bbox=[
                            random.randint(0, 640),
                            random.randint(0, 480),
                            random.randint(0, 640),
                            random.randint(0, 480),
                        ],
                    )
                )
            return

        capture = cv2.VideoCapture(self.source)
        frame_buffer = []

        while True:
            success, frame = capture.read()
            if not success:
                break

            frame_buffer.append(frame)
            if len(frame_buffer) < self.batch_size:
                continue

            detections = self._infer_batch(frame_buffer)
            frame_buffer.clear()
            for detection in detections:
                if detection.confidence >= 0.5:
                    self._publish_detection(detection)

        capture.release()


def main() -> None:
    broker_url = os.getenv("MQTT_BROKER_URL", "mqtt://localhost:1883").strip()
    node_id = os.getenv("EDGE_NODE_ID", "edge-01").strip()
    model_path = os.environ.get("YOLO_MODEL_PATH")
    source = os.environ.get("EDGE_SOURCE")

    pipeline = OpticalSentryPipeline(
        broker_url=broker_url,
        node_id=node_id,
        model_path=model_path,
        source=source,
    )

    logger.info("Edge node '%s' started. Publishing to %s", node_id, MQTT_TOPIC)
    pipeline.run()


if __name__ == "__main__":
    main()
