FROM python:3.11-slim

WORKDIR /app

# Install curl for HEALTHCHECK and libGL for OpenCV/MediaPipe
RUN apt-get update && apt-get install -y curl libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY ml_service_requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml_service_main.py main.py
COPY biomarker_extractor.py biomarker_extractor.py

RUN mkdir -p /app/modelo

ENV MPLBACKEND=Agg

ENV MODELO_PATH=/app/modelo/asd_classifier.h5
ENV METADATA_PATH=/app/modelo/asd_classifier_metadata.json
ENV PREPROCESSOR_PATH=/app/modelo/preprocessor.pkl

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]