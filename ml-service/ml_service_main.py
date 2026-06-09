"""
AutiSense — ML Service
======================
FastAPI que expone el modelo SVM entrenado.
Solo accesible desde el backend principal (red interna Docker).

Endpoints:
    POST /predict   — recibe video, devuelve predicción
    GET  /health    — estado del servicio
    GET  /info      — información del modelo cargado
"""

import os
import time
import uuid
import shutil
import logging
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
import joblib
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# video_to_features debe estar en el mismo directorio
from video_to_features import extraer_features_de_video, NOMBRES_FEATURES

# ─────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────

MODELO_PATH  = os.getenv("MODELO_PATH",  "/app/modelo/mejor_modelo_v2.pkl")
TEMP_DIR     = os.getenv("TEMP_DIR",     "/tmp/autisense_videos")
MAX_VIDEO_MB = int(os.getenv("MAX_VIDEO_MB", "100"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("autisense-ml")

Path(TEMP_DIR).mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────
# CARGA DEL MODELO AL INICIAR
# ─────────────────────────────────────────────────────────────────

bundle    = None
modelo    = None
umbral    = 0.5
meta_info = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global bundle, modelo, umbral, meta_info
    log.info(f"Cargando modelo desde {MODELO_PATH}...")
    try:
        bundle   = joblib.load(MODELO_PATH)
        modelo   = bundle["modelo"]
        umbral   = bundle.get("umbral_clinico", 0.5)
        meta_info = {
            "ganador"        : bundle.get("ganador", "desconocido"),
            "features"       : bundle.get("features", NOMBRES_FEATURES),
            "umbral_clinico" : umbral,
            "clases"         : bundle.get("clases", {0: "TD", 1: "ASD"}),
            "n_features"     : len(bundle.get("features", NOMBRES_FEATURES)),
        }
        log.info(f"Modelo cargado: {meta_info['ganador']}  |  umbral={umbral:.3f}")
    except Exception as e:
        log.error(f"Error cargando modelo: {e}")
        raise
    yield
    log.info("Servicio detenido")

app = FastAPI(
    title       = "AutiSense ML Service",
    description = "Predicción TEA vs Neurotípico a partir de video",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# Solo permitir llamadas desde el backend interno
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["http://backend:3000", "http://localhost:3000"],
    allow_methods  = ["POST", "GET"],
    allow_headers  = ["*"],
)


# ─────────────────────────────────────────────────────────────────
# SCHEMAS DE RESPUESTA
# ─────────────────────────────────────────────────────────────────

class PrediccionResponse(BaseModel):
    prediccion         : str        # "ASD" o "TD"
    probabilidad_asd   : float      # 0.0 – 1.0
    confianza          : str        # "alta" | "media" | "baja"
    umbral_usado       : float
    tiempo_extraccion_ms: int       # ms que tardó MediaPipe
    tiempo_total_ms    : int        # ms totales incluyendo predicción
    features           : dict       # las 34 features calculadas
    modelo             : str        # nombre del modelo usado
    advertencias       : list[str]  # ej: poca detección de cara

class HealthResponse(BaseModel):
    estado  : str
    modelo  : str
    umbral  : float

class InfoResponse(BaseModel):
    modelo          : str
    umbral_clinico  : float
    n_features      : int
    features        : list[str]
    clases          : dict


# ─────────────────────────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────────────────────────

def _nivel_confianza(prob: float, umbral: float) -> str:
    distancia = abs(prob - umbral)
    if distancia >= 0.25:
        return "alta"
    if distancia >= 0.10:
        return "media"
    return "baja"

def _validar_video(archivo: UploadFile) -> None:
    tipos_validos = {"video/mp4", "video/avi", "video/quicktime",
                     "video/webm", "video/x-msvideo"}
    if archivo.content_type and archivo.content_type not in tipos_validos:
        raise HTTPException(
            status_code = 415,
            detail      = f"Tipo de archivo no soportado: {archivo.content_type}. "
                          f"Usa mp4, avi, mov o webm."
        )


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    return HealthResponse(
        estado = "ok",
        modelo = meta_info.get("ganador", "desconocido"),
        umbral = umbral,
    )


@app.get("/info", response_model=InfoResponse)
async def info():
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    return InfoResponse(
        modelo         = meta_info["ganador"],
        umbral_clinico = meta_info["umbral_clinico"],
        n_features     = meta_info["n_features"],
        features       = meta_info["features"],
        clases         = {str(k): v for k, v in meta_info["clases"].items()},
    )


@app.post("/predict", response_model=PrediccionResponse)
async def predict(
    video             : UploadFile = File(..., description="Video de la sesión (.mp4/.avi/.mov/.webm)"),
    edad_meses        : float      = Form(default=0.,  description="Edad del paciente en meses"),
    genero_masculino  : float      = Form(default=0.,  description="1.0 si masculino, 0.0 si femenino"),
):
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no disponible")

    _validar_video(video)

    # Guardar video temporalmente con nombre único
    ext       = Path(video.filename or "video.mp4").suffix or ".mp4"
    temp_path = Path(TEMP_DIR) / f"{uuid.uuid4().hex}{ext}"

    try:
        t_inicio = time.time()

        # ── Guardar archivo ──────────────────────────────────────
        with open(temp_path, "wb") as f:
            contenido = await video.read()
            if len(contenido) > MAX_VIDEO_MB * 1024 * 1024:
                raise HTTPException(
                    status_code = 413,
                    detail      = f"Video demasiado grande. Máximo {MAX_VIDEO_MB}MB."
                )
            f.write(contenido)

        log.info(f"Video recibido: {temp_path.name}  ({len(contenido)/1024/1024:.1f}MB)")

        # ── Extraer features con MediaPipe ───────────────────────
        t_extraccion_inicio = time.time()
        features_arr, nombres = extraer_features_de_video(
            str(temp_path),
            edad             = edad_meses,
            genero_masculino = genero_masculino,
        )
        t_extraccion_ms = int((time.time() - t_extraccion_inicio) * 1000)

        # ── Predicción ───────────────────────────────────────────
        prob_asd   = float(modelo.predict_proba([features_arr])[0][1])
        prediccion = "ASD" if prob_asd >= umbral else "TD"

        t_total_ms = int((time.time() - t_inicio) * 1000)

        # ── Advertencias de calidad ──────────────────────────────
        advertencias = []
        pct_perdida = float(features_arr[nombres.index("pct_perdida_gaze")])
        if pct_perdida > 0.40:
            advertencias.append(
                f"Alta pérdida de tracking: {pct_perdida*100:.0f}% de frames sin detección. "
                "El resultado puede ser menos confiable."
            )
        n_muestras_norm = float(features_arr[nombres.index("n_muestras_norm")])
        if n_muestras_norm < 0.10:
            advertencias.append("Video muy corto. Se recomienda al menos 15 segundos.")

        confianza = _nivel_confianza(prob_asd, umbral)
        features_dict = {n: round(float(v), 6)
                         for n, v in zip(nombres, features_arr)}

        log.info(
            f"Predicción: {prediccion}  prob={prob_asd:.3f}  "
            f"confianza={confianza}  tiempo={t_total_ms}ms"
        )

        return PrediccionResponse(
            prediccion          = prediccion,
            probabilidad_asd    = round(prob_asd, 4),
            confianza           = confianza,
            umbral_usado        = umbral,
            tiempo_extraccion_ms= t_extraccion_ms,
            tiempo_total_ms     = t_total_ms,
            features            = features_dict,
            modelo              = meta_info.get("ganador", "SVM"),
            advertencias        = advertencias,
        )

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error procesando video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    finally:
        # Siempre eliminar el video temporal
        if temp_path.exists():
            temp_path.unlink()
            log.info(f"Video temporal eliminado: {temp_path.name}")
