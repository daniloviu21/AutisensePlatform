FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    libgl1-mesa-glx ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ml_service_requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml_service_main.py main.py
COPY video_to_features.py .

RUN mkdir -p /app/modelo /tmp/autisense_videos

ENV MODELO_PATH=/app/modelo/mejor_modelo_v2.pkl
ENV TEMP_DIR=/tmp/autisense_videos
ENV MAX_VIDEO_MB=100

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]