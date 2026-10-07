import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Header, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.face_engine import detect_faces, embed_single_face, warm_up

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("snapshare.ai")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    warm_up()  # runs once at startup, before the first request
    yield


app = FastAPI(
    lifespan=lifespan,
    title="SnapShare AI Service",
    description="Internal face-detection and embedding microservice (InsightFace). Not for public internet exposure.",
    version="1.0.0",
)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_SELFIES_PER_REQUEST = 3


def verify_internal_secret(x_internal_secret: str | None):
    if not settings.internal_shared_secret:
        logger.warning("INTERNAL_SHARED_SECRET is not set — running with NO request authentication!")
        return
    if x_internal_secret != settings.internal_shared_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing internal secret")


@app.post("/detect-and-embed")
def detect_and_embed(
    image: UploadFile = File(...),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
):
    verify_internal_secret(x_internal_secret)
    started = time.perf_counter()

    contents = image.file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")

    try:
        faces = detect_faces(contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Face detection failed")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {e}")

    logger.info(f"detect-and-embed: {len(faces)} face(s) in {(time.perf_counter() - started) * 1000:.0f} ms")
    return JSONResponse({"faces": faces, "faceCount": len(faces)})


@app.post("/embed-selfie")
def embed_selfie(
    image: list[UploadFile] = File(...),
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
):
    verify_internal_secret(x_internal_secret)
    started = time.perf_counter()

    if len(image) > MAX_SELFIES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"Send at most {MAX_SELFIES_PER_REQUEST} selfie images")

    results = []
    for upload in image:
        contents = upload.file.read()
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds maximum allowed size")
        try:
            result = embed_single_face(contents)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.exception("Selfie embedding failed")
            raise HTTPException(status_code=500, detail=f"Selfie embedding failed: {e}")
        finally:
            del contents

        results.append(result if result is not None else {"embedding": None})

    logger.info(f"embed-selfie: {len(image)} image(s) in {(time.perf_counter() - started) * 1000:.0f} ms")
    return JSONResponse({"results": results})