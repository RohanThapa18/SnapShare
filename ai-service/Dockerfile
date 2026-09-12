FROM python:3.11-slim

WORKDIR /app

# System deps required by opencv-python-headless and onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# InsightFace downloads its model weights (~a few hundred MB) to this
# cache dir on first run. In production, consider baking the model into
# the image or mounting a persistent volume so cold starts aren't slow.
ENV INSIGHTFACE_HOME=/app/.insightface

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
