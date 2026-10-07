import logging
import time
import numpy as np
import cv2
from insightface.app import FaceAnalysis

from app.config import settings

logger = logging.getLogger("snapshare.ai")

_face_app: FaceAnalysis | None = None

# Below this, InsightFace's own detector confidence is too low to trust
# the embedding (common on tiny/blurry/heavily-angled background faces).
MIN_DET_SCORE = 0.5
# A face smaller than this fraction of the image area rarely has enough
# resolution for ArcFace to produce a discriminative embedding.
MIN_FACE_AREA_RATIO = 0.015


def get_face_app() -> FaceAnalysis:
    global _face_app
    if _face_app is None:
        started = time.perf_counter()
        logger.info(f"Loading InsightFace model '{settings.insightface_model_name}'...")
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if settings.ctx_id >= 0
            else ["CPUExecutionProvider"]
        )
        # Only the face box, the 5 alignment keypoints and the ArcFace embedding
        # are used, so skip the landmark and gender/age models.
        _face_app = FaceAnalysis(
            name=settings.insightface_model_name,
            allowed_modules=["detection", "recognition"],
            providers=providers,
        )
        _face_app.prepare(ctx_id=settings.ctx_id, det_size=(settings.detection_size, settings.detection_size))
        logger.info(f"InsightFace model loaded in {time.perf_counter() - started:.1f}s.")
    return _face_app


def warm_up() -> None:
    """Load the model at startup so the first real request doesn't pay for it."""
    face_app = get_face_app()
    size = settings.detection_size
    started = time.perf_counter()
    face_app.get(np.zeros((size, size, 3), dtype=np.uint8))
    logger.info(f"Warm-up inference done in {time.perf_counter() - started:.2f}s.")


def decode_image(image_bytes: bytes) -> np.ndarray:
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — file may be corrupted or an unsupported format")
    return img


def _bbox_area(face) -> float:
    x1, y1, x2, y2 = face.bbox
    return max(0.0, (x2 - x1)) * max(0.0, (y2 - y1))


def detect_faces(image_bytes: bytes) -> list[dict]:
    """
    Detects all faces in an image and returns embeddings + bounding boxes.
    Used for event photos, which may contain multiple people. Faces that
    fail the quality gate (too small or too low detector confidence — the
    common case in crowd shots or motion blur) are dropped entirely rather
    than stored: a noisy embedding only adds false-positive risk to every
    future search against this event, never a real benefit.
    """
    img = decode_image(image_bytes)
    face_app = get_face_app()
    faces = face_app.get(img)
    img_area = img.shape[0] * img.shape[1] or 1

    results = []
    for idx, face in enumerate(faces):
        area_ratio = _bbox_area(face) / img_area
        if face.det_score < MIN_DET_SCORE or area_ratio < MIN_FACE_AREA_RATIO:
            continue

        bbox = face.bbox.astype(int).tolist()
        results.append(
            {
                "faceIndex": idx,
                "boundingBox": {
                    "x": bbox[0],
                    "y": bbox[1],
                    "width": bbox[2] - bbox[0],
                    "height": bbox[3] - bbox[1],
                },
                "embedding": (face.normed_embedding).tolist(),
                "detScore": float(face.det_score),
            }
        )
    return results


def embed_single_face(image_bytes: bytes) -> dict | None:
    """
    Used for selfie uploads. Returns quality metadata alongside the
    embedding so the caller can decide whether to trust it, rather than
    silently accepting whatever face happened to be biggest.
    """
    img = decode_image(image_bytes)
    face_app = get_face_app()
    faces = face_app.get(img, max_num=1)

    if not faces:
        return None

    img_area = img.shape[0] * img.shape[1] or 1
    best = max(faces, key=_bbox_area)
    area_ratio = _bbox_area(best) / img_area

    return {
        "embedding": best.normed_embedding.tolist(),
        "detScore": float(best.det_score),
        "faceAreaRatio": float(area_ratio),
        "lowQuality": bool(best.det_score < MIN_DET_SCORE or area_ratio < MIN_FACE_AREA_RATIO),
    }