import logging

from fastapi import FastAPI, File, UploadFile, Header, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.face_engine import detect_faces, embed_single_face

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snapshare.ai")

app = FastAPI(
    title="SnapShare AI Service",
    description="Internal face-detection and embedding microservice (InsightFace). Not for public internet exposure.",
    version="1.0.0",
)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB, matches backend's MAX_FILE_SIZE_MB default


def verify_internal_secret(x_internal_secret: str | None):
    """
    Every request must carry the shared secret configured in both this
    service's env and the Node backend's AI_SERVICE_SHARED_SECRET.
    This is a defense-in-depth measure — this service should also sit
    on a private network / internal-only URL in production, never
    exposed directly to the internet.
    """
    if not settings.internal_shared_secret:
        logger.warning("INTERNAL_SHARED_SECRET is not set — running with NO request authentication!")
        return
    if x_internal_secret != settings.internal_shared_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing internal secret")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "snapshare-ai"}


@app.post("/detect-and-embed")
async def detect_and_embed(
    image: UploadFile = File(...),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
):
    """
    Used for event photos. May contain zero, one, or many faces.
    Returns one entry per detected face with bounding box + embedding.
    """
    verify_internal_secret(x_internal_secret)

    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")

    try:
        faces = detect_faces(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Face detection failed")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {e}")

    return JSONResponse({"faces": faces, "faceCount": len(faces)})


@app.post("/embed-selfie")
async def embed_selfie(
    image: UploadFile = File(...),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
):
    """
    Used for participant selfies in Find My Photos. Returns a single
    embedding for the most prominent face. The image bytes are held only
    in memory for the duration of this request and are never written to
    disk or any persistent store by this service.
    """
    verify_internal_secret(x_internal_secret)

    contents = await image.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")

    try:
        embedding = embed_single_face(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Selfie embedding failed")
        raise HTTPException(status_code=500, detail=f"Selfie embedding failed: {e}")
    finally:
        # Explicit, even though `contents` goes out of scope anyway —
        # the intent (never persist selfies) should be unmistakable here.
        del contents

    if embedding is None:
        return JSONResponse({"embedding": None, "message": "No face detected"}, status_code=200)

    return JSONResponse({"embedding": embedding})
