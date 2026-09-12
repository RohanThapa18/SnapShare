import logging
import numpy as np
import cv2
from insightface.app import FaceAnalysis

from app.config import settings

logger = logging.getLogger("snapshare.ai")

_face_app: FaceAnalysis | None = None


def get_face_app() -> FaceAnalysis:
    """
    Lazily loads the InsightFace model (buffalo_l by default — a solid
    accuracy/speed tradeoff for detection + ArcFace embeddings). Loaded
    once per process and reused across requests.
    """
    global _face_app
    if _face_app is None:
        logger.info(f"Loading InsightFace model '{settings.insightface_model_name}'...")
        _face_app = FaceAnalysis(name=settings.insightface_model_name)
        _face_app.prepare(ctx_id=settings.ctx_id, det_size=(settings.detection_size, settings.detection_size))
        logger.info("InsightFace model loaded.")
    return _face_app


def decode_image(image_bytes: bytes) -> np.ndarray:
    array = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — file may be corrupted or an unsupported format")
    return img


def detect_faces(image_bytes: bytes) -> list[dict]:
    """
    Detects all faces in an image and returns embeddings + bounding boxes.
    Used for event photos, which may contain multiple people.
    """
    img = decode_image(image_bytes)
    face_app = get_face_app()
    faces = face_app.get(img)

    results = []
    for idx, face in enumerate(faces):
        bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
        results.append(
            {
                "faceIndex": idx,
                "boundingBox": {
                    "x": bbox[0],
                    "y": bbox[1],
                    "width": bbox[2] - bbox[0],
                    "height": bbox[3] - bbox[1],
                },
                # ArcFace embedding, L2-normalized so cosine similarity is
                # well-behaved on the Node side.
                "embedding": (face.normed_embedding).tolist(),
            }
        )
    return results


def embed_single_face(image_bytes: bytes) -> list[float] | None:
    """
    Used for selfie uploads — returns the embedding of the single most
    prominent (largest bounding box) detected face, or None if no face
    was found. The caller (main.py) is responsible for discarding the
    image bytes immediately after this call returns.
    """
    img = decode_image(image_bytes)
    face_app = get_face_app()
    faces = face_app.get(img)

    if not faces:
        return None

    # If multiple faces appear in a selfie, use the largest one (most likely the subject)
    def area(f):
        x1, y1, x2, y2 = f.bbox
        return (x2 - x1) * (y2 - y1)

    best = max(faces, key=area)
    return best.normed_embedding.tolist()
