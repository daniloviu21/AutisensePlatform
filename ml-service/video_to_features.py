"""
video_to_features.py
====================
Convierte un video (.mp4, .avi, .mov, .webm) en el vector de 34 features
que espera el modelo SVM entrenado con el dataset Cilia.

Dependencias:
    pip install mediapipe opencv-python numpy

Uso:
    from video_to_features import extraer_features_de_video
    features, nombres = extraer_features_de_video("sesion.mp4")
"""

import cv2
import numpy as np
import time
from typing import Tuple

try:
    import mediapipe as mp
    MP_DISPONIBLE = True
except ImportError:
    MP_DISPONIBLE = False
    print("⚠️  mediapipe no instalado. Instala con: pip install mediapipe")

# ─────────────────────────────────────────────────────────────────
# CONSTANTES — deben coincidir exactamente con el pipeline de entrenamiento
# ─────────────────────────────────────────────────────────────────

N_VENTANAS = 5

# Índices de landmarks de MediaPipe FaceMesh para iris
# Ojo derecho: 468-472  |  Ojo izquierdo: 473-477
IRIS_DER_IDX = [468, 469, 470, 471, 472]
IRIS_IZQ_IDX = [473, 474, 475, 476, 477]

# Centro del iris (índice 0 de cada grupo)
IRIS_DER_CENTRO = 468
IRIS_IZQ_CENTRO = 473

# Landmarks de pose para esqueleto (MediaPipe Pose)
POSE_NARIZ        = 0
POSE_HOMBRO_IZQ   = 11
POSE_HOMBRO_DER   = 12
POSE_CODO_IZQ     = 13
POSE_CODO_DER     = 14
POSE_MUNECA_IZQ   = 15
POSE_MUNECA_DER   = 16

NOMBRES_FEATURES = [
    "edad", "genero_masculino",
    "pct_perdida_gaze", "racha_atencion",
    "media_gaze_x", "var_gaze_x", "rango_gaze_x", "entropia_gaze_x", "picos_gaze_x",
    "media_gaze_y", "var_gaze_y", "rango_gaze_y", "entropia_gaze_y", "picos_gaze_y",
    "vent_x_1", "vent_x_2", "vent_x_3", "vent_x_4", "vent_x_5",
    "vent_y_1", "vent_y_2", "vent_y_3", "vent_y_4", "vent_y_5",
    "media_pupila", "var_pupila", "rango_pupila",
    "vel_sacada",
    "var_gvx", "var_gvy",
    "corr_ojos_x", "corr_ojos_y",
    "asimetria_pupila",
    "n_muestras_norm",
]

assert len(NOMBRES_FEATURES) == 34, "Debe haber exactamente 34 features"


# ─────────────────────────────────────────────────────────────────
# UTILIDADES DE SEÑAL — idénticas al pipeline de entrenamiento
# ─────────────────────────────────────────────────────────────────

def _stats(arr: np.ndarray) -> dict:
    if len(arr) < 2:
        return dict(media=0., varianza=0., rango=0., entropia=0.)
    hist, _ = np.histogram(arr, bins=10, density=True)
    hist = hist[hist > 0]
    n_bins = max(len(hist), 2)
    return dict(
        media    = float(np.mean(arr)),
        varianza = float(np.var(arr)),
        rango    = float(np.ptp(arr)),
        entropia = float(-np.sum(hist * np.log(hist + 1e-9)) / np.log(n_bins)),
    )

def _picos(arr: np.ndarray, pct: int = 90) -> float:
    if len(arr) < 5:
        return 0.
    d = np.abs(np.diff(arr))
    return float(np.sum(d > np.percentile(d, pct)) / len(d)) if len(d) else 0.

def _ventanas(arr: np.ndarray, n: int = N_VENTANAS) -> list:
    if len(arr) < n:
        return [0.] * n
    return [float(np.var(c)) if len(c) > 1 else 0.
            for c in np.array_split(arr, n)]

def _racha_max(arr: np.ndarray) -> float:
    """Racha máxima de valores válidos (no-NaN) consecutivos."""
    m = r = 0
    for v in arr:
        if not np.isnan(v):
            r += 1; m = max(m, r)
        else:
            r = 0
    return float(m)

def _corr(a: np.ndarray, b: np.ndarray) -> float:
    n = min(len(a), len(b))
    if n < 5:
        return 0.
    x, y = a[:n], b[:n]
    if np.std(x) < 1e-9 or np.std(y) < 1e-9:
        return 0.
    return float(np.corrcoef(x, y)[0, 1])

def _vel_sacada(x: np.ndarray, y: np.ndarray, dt: float = 1/30) -> float:
    """Velocidad media de sacadas (unidades normalizadas / segundo)."""
    if len(x) < 3:
        return 0.
    return float(np.mean(np.sqrt(np.diff(x)**2 + np.diff(y)**2) / dt))

def _radio_iris(landmarks, indices, w, h) -> float:
    """Estima radio del iris como proxy del diámetro pupilar."""
    pts = np.array([[landmarks[i].x * w, landmarks[i].y * h]
                    for i in indices])
    centro = pts[0]
    radios = np.linalg.norm(pts[1:] - centro, axis=1)
    return float(np.mean(radios)) if len(radios) > 0 else 0.


# ─────────────────────────────────────────────────────────────────
# EXTRACCIÓN FRAME A FRAME
# ─────────────────────────────────────────────────────────────────

def _procesar_video(ruta_video: str) -> dict:
    """
    Procesa el video frame a frame con MediaPipe.
    Devuelve un dict con series temporales crudas.
    """
    if not MP_DISPONIBLE:
        raise RuntimeError("mediapipe no está instalado")

    mp_face = mp.solutions.face_mesh
    mp_pose = mp.solutions.pose

    # Series temporales — una entrada por frame
    rx_list, ry_list = [], []   # ojo derecho
    lx_list, ly_list = [], []   # ojo izquierdo
    pd_r_list = []              # radio iris derecho (proxy pupila)
    pd_l_list = []              # radio iris izquierdo
    gvx_list, gvy_list = [], [] # vector de gaze aproximado
    frames_validos = 0
    frames_totales = 0

    cap = cv2.VideoCapture(ruta_video)
    if not cap.isOpened():
        raise FileNotFoundError(f"No se pudo abrir el video: {ruta_video}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    with mp_face.FaceMesh(
        static_image_mode        = False,
        max_num_faces            = 1,
        refine_landmarks         = True,   # necesario para iris (468-477)
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5,
    ) as face_mesh:

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            frames_totales += 1
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            resultado = face_mesh.process(rgb)

            if resultado.multi_face_landmarks:
                lm = resultado.multi_face_landmarks[0].landmark
                frames_validos += 1

                # Coordenadas del iris (normalizadas 0-1, convertidas a px)
                cx_r = lm[IRIS_DER_CENTRO].x * w
                cy_r = lm[IRIS_DER_CENTRO].y * h
                cx_l = lm[IRIS_IZQ_CENTRO].x * w
                cy_l = lm[IRIS_IZQ_CENTRO].y * h

                rx_list.append(cx_r);  ry_list.append(cy_r)
                lx_list.append(cx_l);  ly_list.append(cy_l)

                # Radio iris como proxy de tamaño pupilar
                pd_r_list.append(_radio_iris(lm, IRIS_DER_IDX, w, h))
                pd_l_list.append(_radio_iris(lm, IRIS_IZQ_IDX, w, h))

                # Vector de gaze: diferencia entre iris derecho e izquierdo
                # (proxy simple — en un eye tracker real vendría calibrado)
                gvx_list.append(cx_r - cx_l)
                gvy_list.append(cy_r - cy_l)
            else:
                # Frame sin detección → NaN para calcular pérdida
                rx_list.append(np.nan)
                ry_list.append(np.nan)
                lx_list.append(np.nan)
                ly_list.append(np.nan)
                pd_r_list.append(np.nan)
                pd_l_list.append(np.nan)
                gvx_list.append(np.nan)
                gvy_list.append(np.nan)

    cap.release()

    return {
        "rx"           : np.array(rx_list),
        "ry"           : np.array(ry_list),
        "lx"           : np.array(lx_list),
        "ly"           : np.array(ly_list),
        "pd_r"         : np.array(pd_r_list),
        "pd_l"         : np.array(pd_l_list),
        "gvx"          : np.array(gvx_list),
        "gvy"          : np.array(gvy_list),
        "frames_totales": frames_totales,
        "frames_validos": frames_validos,
        "fps"           : fps,
        "resolucion"    : (w, h),
    }


# ─────────────────────────────────────────────────────────────────
# CONSTRUCCIÓN DEL VECTOR DE FEATURES
# ─────────────────────────────────────────────────────────────────

def construir_vector(series: dict, edad: float = 0., genero_masculino: float = 0.) -> np.ndarray:
    """
    Recibe las series crudas y devuelve el vector de 34 features
    en el mismo orden que NOMBRES_FEATURES.

    Parámetros opcionales:
        edad              — edad en meses (0 si no se conoce)
        genero_masculino  — 1.0 si masculino, 0.0 si femenino
    """
    rx  = series["rx"];   ry  = series["ry"]
    lx  = series["lx"];   ly  = series["ly"]
    pdr = series["pd_r"]; pdl = series["pd_l"]
    gvx = series["gvx"];  gvy = series["gvy"]
    n_total = series["frames_totales"]

    # Señal combinada (promedio ojo derecho e izquierdo, solo frames válidos)
    n = min(np.sum(~np.isnan(rx)), np.sum(~np.isnan(lx)))
    rx_v = rx[~np.isnan(rx)]
    ry_v = ry[~np.isnan(ry)]
    lx_v = lx[~np.isnan(lx)]
    ly_v = ly[~np.isnan(ly)]
    nn   = min(len(rx_v), len(lx_v))
    gx   = (rx_v[:nn] + lx_v[:nn]) / 2 if nn > 0 else np.array([0.])
    gy   = (ry_v[:nn] + ly_v[:nn]) / 2 if nn > 0 else np.array([0.])

    pdr_v = pdr[~np.isnan(pdr)]
    pdl_v = pdl[~np.isnan(pdl)]
    gvx_v = gvx[~np.isnan(gvx)]
    gvy_v = gvy[~np.isnan(gvy)]

    # Pérdida de tracking
    pct_perdida  = float(np.isnan(rx).sum() / max(n_total, 1))
    racha_aten   = _racha_max(rx) / max(n_total, 1)

    sx  = _stats(gx);  sy  = _stats(gy);  spd = _stats(pdr_v)
    vx  = _ventanas(gx);  vy = _ventanas(gy)

    vector = [
        edad,
        genero_masculino,
        pct_perdida,
        racha_aten,
        sx["media"],    sx["varianza"], sx["rango"],   sx["entropia"], _picos(gx),
        sy["media"],    sy["varianza"], sy["rango"],   sy["entropia"], _picos(gy),
        *vx,
        *vy,
        spd["media"],   spd["varianza"], spd["rango"],
        _vel_sacada(gx, gy, dt=1/max(series["fps"], 1)),
        _stats(gvx_v)["varianza"],
        _stats(gvy_v)["varianza"],
        _corr(rx_v, lx_v),
        _corr(ry_v, ly_v),
        abs(_stats(pdr_v)["media"] - _stats(pdl_v)["media"]),
        float(n_total) / 5000.,
    ]

    assert len(vector) == 34, f"Vector tiene {len(vector)} features, esperaba 34"
    return np.array(vector, dtype=np.float32)


# ─────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL — punto de entrada para el ML service
# ─────────────────────────────────────────────────────────────────

def extraer_features_de_video(
    ruta_video: str,
    edad: float = 0.,
    genero_masculino: float = 0.,
) -> Tuple[np.ndarray, list]:
    """
    Función principal. Recibe la ruta de un video y devuelve:
        features       — np.ndarray de shape (34,)
        nombres        — lista con el nombre de cada feature

    Ejemplo:
        features, nombres = extraer_features_de_video("video.mp4", edad=72, genero_masculino=1)
        df = pd.DataFrame([features], columns=nombres)
    """
    t0      = time.time()
    series  = _procesar_video(ruta_video)
    vector  = construir_vector(series, edad=edad, genero_masculino=genero_masculino)
    t_total = time.time() - t0

    duracion_s    = series["frames_totales"] / max(series["fps"], 1)
    pct_deteccion = series["frames_validos"] / max(series["frames_totales"], 1) * 100

    print(f"✅ Video procesado en {t_total:.2f}s")
    print(f"   Duración      : {duracion_s:.1f}s  ({series['frames_totales']} frames a {series['fps']:.1f} fps)")
    print(f"   Detección cara: {pct_deteccion:.1f}%  ({series['frames_validos']}/{series['frames_totales']} frames)")
    print(f"   Resolución    : {series['resolucion'][0]}x{series['resolucion'][1]}")

    return vector, NOMBRES_FEATURES


# ─────────────────────────────────────────────────────────────────
# TEST RÁPIDO — ejecutar directamente para verificar
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python video_to_features.py <ruta_video.mp4>")
        print("\nVerificando que las 34 features están correctamente definidas...")
        print(f"Nombres: {NOMBRES_FEATURES}")
        print(f"Total  : {len(NOMBRES_FEATURES)}")
        sys.exit(0)

    ruta = sys.argv[1]
    print(f"\n🎬 Procesando: {ruta}")
    features, nombres = extraer_features_de_video(ruta)

    print(f"\n📊 Vector de features ({len(features)}):")
    for nombre, valor in zip(nombres, features):
        print(f"   {nombre:<25} {valor:>10.4f}")
