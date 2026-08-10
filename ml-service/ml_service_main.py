import os
import time
import json
import tempfile
import logging
import joblib
import pandas as pd
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import tensorflow as tf

from biomarker_extractor import extraer_qchat_de_video

# ─────────────────────────────────────────────────────────────────
# CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────

MODELO_PATH       = os.getenv("MODELO_PATH",       "/app/modelo/asd_classifier.keras")
METADATA_PATH     = os.getenv("METADATA_PATH",     "/app/modelo/asd_classifier_metadata.json")
PREPROCESSOR_PATH = os.getenv("PREPROCESSOR_PATH", "/app/modelo/preprocessor.pkl")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("autisense-ml")

# ─────────────────────────────────────────────────────────────────
# CARGA DEL MODELO AL INICIAR
# ─────────────────────────────────────────────────────────────────

modelo       = None
preprocessor = None
umbral       = 0.5
meta_info    = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global modelo, preprocessor, umbral, meta_info
    log.info(f"Cargando modelo desde {MODELO_PATH}...")
    try:
        modelo = tf.keras.models.load_model(MODELO_PATH)
        
        with open(METADATA_PATH, 'r', encoding='utf-8') as f:
            meta_info = json.load(f)
            
        umbral = meta_info.get("optimal_threshold", 0.5)
        
        log.info(f"Cargando preprocesador desde {PREPROCESSOR_PATH}...")
        if os.path.exists(PREPROCESSOR_PATH):
            preprocessor = joblib.load(PREPROCESSOR_PATH)
        else:
            log.warning(f"No se encontro {PREPROCESSOR_PATH}. Falta ejecutar asd_classifier.py con el dataset para generarlo.")
        
        log.info(f"Modelo cargado: {meta_info.get('model_name', 'desconocido')}  |  umbral={umbral:.3f}")
    except Exception as e:
        log.error(f"Error cargando modelo, metadata o preprocesador: {e}")
        raise
    yield
    log.info("Servicio detenido")

app = FastAPI(
    title       = "AutiSense ML Service",
    description = "Extracción de biomarcadores desde video y predicción TEA con Keras",
    version     = "3.0.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["*"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


# ─────────────────────────────────────────────────────────────────
# SCHEMAS DE RESPUESTA
# ─────────────────────────────────────────────────────────────────

class PrediccionResponse(BaseModel):
    prediccion         : str
    probabilidad_asd   : float
    confianza          : str
    umbral_usado       : float
    tiempo_extraccion_ms : int
    tiempo_total_ms    : int
    modelo             : str
    features           : dict
    advertencias       : list[str]

class HealthResponse(BaseModel):
    estado  : str
    modelo  : str
    umbral  : float

class InfoResponse(BaseModel):
    modelo          : str
    umbral_clinico  : float
    n_features      : int
    features        : list[str]

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


# ─────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    return HealthResponse(
        estado = "ok",
        modelo = meta_info.get("model_name", "desconocido"),
        umbral = umbral,
    )

@app.get("/info", response_model=InfoResponse)
async def info():
    if modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    return InfoResponse(
        modelo         = meta_info.get("model_name", "desconocido"),
        umbral_clinico = umbral,
        n_features     = meta_info.get("n_features", 0),
        features       = meta_info.get("feature_names", []),
    )

@app.post("/predict", response_model=PrediccionResponse)
async def predict(
    video: UploadFile = File(...),
    edad_meses: int = Form(...),
    sexo: str = Form(...),
    etnia: str = Form(...),
    ictericia: str = Form(...),
    familiar_tea: str = Form(...)
):
    if modelo is None or preprocessor is None:
        raise HTTPException(status_code=503, detail="Modelo o preprocesador no disponibles")

    # Guardar video temporalmente
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_vid:
        tmp_vid.write(await video.read())
        ruta_temporal = tmp_vid.name

    try:
        t_inicio = time.time()

        # 1. Extracción de biomarcadores del video
        log.info(f"Extrayendo biomarcadores de video {video.filename}...")
        df_features = extraer_qchat_de_video(
            ruta_video=ruta_temporal,
            edad_meses=edad_meses,
            sexo=sexo,
            etnia=etnia,
            ictericia=ictericia,
            familiar_asd=familiar_tea
        )
        
        t_extraccion_ms = int((time.time() - t_inicio) * 1000)

        # 2. Preprocesamiento (ColumnTransformer)
        log.info("Aplicando ColumnTransformer...")
        X_input = preprocessor.transform(df_features)

        # 3. Predicción con modelo Keras
        log.info("Ejecutando modelo Keras...")
        prob_asd = float(modelo.predict(X_input, verbose=0)[0][0])
        prediccion = "ASD" if prob_asd >= umbral else "TD"

        t_total_ms = int((time.time() - t_inicio) * 1000)
        confianza = _nivel_confianza(prob_asd, umbral)

        log.info(f"Predicción: {prediccion}  prob={prob_asd:.3f}  confianza={confianza}  tiempo_ext={t_extraccion_ms}ms  tiempo_total={t_total_ms}ms")

        advertencias = []
        if edad_meses < 12 or edad_meses > 36:
            advertencias.append("La edad del paciente está fuera del rango típico (12-36 meses) de validación Q-CHAT.")
            
        features_dict = df_features.iloc[0].to_dict()

        return PrediccionResponse(
            prediccion           = prediccion,
            probabilidad_asd     = round(prob_asd, 4),
            confianza            = confianza,
            umbral_usado         = umbral,
            tiempo_extraccion_ms = t_extraccion_ms,
            tiempo_total_ms      = t_total_ms,
            modelo               = meta_info.get("model_name", "Keras_ASD"),
            features             = features_dict,
            advertencias         = advertencias,
        )

    except Exception as e:
        log.error(f"Error procesando video: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    
    finally:
        if os.path.exists(ruta_temporal):
            os.remove(ruta_temporal)
