"""
================================================================================
 AUTISENSE — Extracción de Biomarcadores Faciales y Posturales (DEMO BETA)
================================================================================

 Propósito:     Solo adquisición y preprocesamiento de video en tiempo real.
                SIN carga de modelos .keras ni clasificación diagnóstica.
                Toda inferencia clínica está fuera del alcance de este script.

 Tracking:      Face Mesh completo (MediaPipe Tasks Vision API, 478 landmarks)
                Estimación de dirección de mirada (landmarks del iris)
                Pose del torso superior (MediaPipe Tasks Vision API, landmarks 0-16)

 Output:        DataFrame de pandas con columnas A1-A10 + variables demográficas,
                compatible con el ColumnTransformer de asd_classifier.py.

 Dependencias:  opencv-python, mediapipe, pandas, numpy
================================================================================
"""

import sys
import time
import math
import os
import urllib.request
import numpy as np
import pandas as pd
import cv2
import mediapipe as mp

# MediaPipe Tasks Vision API (la única disponible en mediapipe>=0.10.35 / Python 3.13)
from mediapipe.tasks import python as mp_python  # type: ignore
from mediapipe.tasks.python import vision  # type: ignore

# Utilidades de dibujo nativas de la Tasks API
mp_drawing = vision.drawing_utils
mp_drawing_styles = vision.drawing_styles

# Forzar codificación UTF-8 en la consola de Windows
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ──────────────────────────────────────────────────────────────────────────────
# 0. CONSTANTES Y CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────────────────────

# Duración de la captura en segundos
DURACION_CAPTURA = 30

# Valores demográficos por defecto
DEFAULT_AGE_MONS = 24
DEFAULT_SEX = "m"
DEFAULT_ETHNICITY = "White European"
DEFAULT_JAUNDICE = "no"
DEFAULT_FAMILY_ASD = "no"

MP_DETECTION_CONF = 0.5
MP_TRACKING_CONF = 0.5

UMBRAL_GAZE_DESVIACION = 0.30
UMBRAL_GIRO_CABEZA_GRADOS = 20.0
UMBRAL_ANGULO_SEÑALAR = 30.0
UMBRAL_VARIANZA_POSTURAL = 0.005

# ─── Nuevos umbrales para A5, A7, A8 ────────────────────────────────────────

# A5: Sonrisa — distancia horizontal entre comisuras (landmarks 61 y 291)
#     normalizada por el ancho de la cara. Valores típicos: 0.38-0.50.
UMBRAL_SONRISA = 0.45

# A7: Imitación gestual — varianza de posición de muñecas (landmarks 15 y 16).
#     Valores altos ≈ más movimiento de manos.
UMBRAL_MOVIMIENTO_MANOS = 0.003

# A8: Respuesta social — umbral de ratio de boca abierta (landmarks 13 y 14)
#     normalizado por altura de cara. Umbral para considerar "boca abierta".
UMBRAL_BOCA_ABIERTA = 0.05
UMBRAL_RATIO_BOCA_ABIERTA_FRAMES = 0.10  # 10% de los frames

# ──────────────────────────────────────────────────────────────────────────────
# 1. DESCARGA DE MODELOS MEDIAPIPE (Tasks API)
# ──────────────────────────────────────────────────────────────────────────────

FACE_MODEL_PATH = "face_landmarker.task"
POSE_MODEL_PATH = "pose_landmarker_lite.task"

def download_model(url, filename):
    if not os.path.exists(filename):
        print(f"  Descargando modelo {filename}...")
        urllib.request.urlretrieve(url, filename)

print("\n  Verificando modelos de MediaPipe Tasks...")
download_model("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", FACE_MODEL_PATH)
download_model("https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", POSE_MODEL_PATH)


# ──────────────────────────────────────────────────────────────────────────────
# 2. INICIALIZACIÓN DE MEDIAPIPE (Tasks API)
# ──────────────────────────────────────────────────────────────────────────────

# FaceLandmarker (modo video)
face_base_options = mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH)
face_options = vision.FaceLandmarkerOptions(
    base_options=face_base_options,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
    num_faces=1,
    min_face_detection_confidence=MP_DETECTION_CONF,
    min_face_presence_confidence=MP_TRACKING_CONF,
    min_tracking_confidence=MP_TRACKING_CONF,
    running_mode=vision.RunningMode.VIDEO
)
face_landmarker = vision.FaceLandmarker.create_from_options(face_options)

# PoseLandmarker (modo video)
pose_base_options = mp_python.BaseOptions(model_asset_path=POSE_MODEL_PATH)
pose_options = vision.PoseLandmarkerOptions(
    base_options=pose_base_options,
    num_poses=1,
    min_pose_detection_confidence=MP_DETECTION_CONF,
    min_pose_presence_confidence=MP_TRACKING_CONF,
    min_tracking_confidence=MP_TRACKING_CONF,
    running_mode=vision.RunningMode.VIDEO
)
pose_landmarker = vision.PoseLandmarker.create_from_options(pose_options)


# ──────────────────────────────────────────────────────────────────────────────
# 3. FUNCIONES AUXILIARES DE GEOMETRÍA
# ──────────────────────────────────────────────────────────────────────────────

def calcular_angulo_3puntos(a, b, c):
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba * mag_bc == 0:
        return 180.0
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))

def estimar_gaze_ratio(face_landmarks, w, h):
    lm = face_landmarks

    iris_izq_x = lm[468].x * w
    ojo_izq_interna_x = lm[362].x * w
    ojo_izq_externa_x = lm[263].x * w
    ancho_ojo_izq = abs(ojo_izq_externa_x - ojo_izq_interna_x)
    ratio_izq = (iris_izq_x - min(ojo_izq_interna_x, ojo_izq_externa_x)) / ancho_ojo_izq if ancho_ojo_izq > 0 else 0.5

    iris_der_x = lm[473].x * w
    ojo_der_interna_x = lm[133].x * w
    ojo_der_externa_x = lm[33].x * w
    ancho_ojo_der = abs(ojo_der_externa_x - ojo_der_interna_x)
    ratio_der = (iris_der_x - min(ojo_der_interna_x, ojo_der_externa_x)) / ancho_ojo_der if ancho_ojo_der > 0 else 0.5

    desviacion_promedio = abs((ratio_izq + ratio_der) / 2.0 - 0.5)
    mirada_al_frente = desviacion_promedio < UMBRAL_GAZE_DESVIACION

    return ratio_izq, ratio_der, mirada_al_frente

def estimar_giro_cabeza(face_landmarks, w, h):
    lm = face_landmarks
    nariz_x = lm[1].x * w
    borde_izq_x = lm[234].x * w
    borde_der_x = lm[454].x * w
    ancho_cara = abs(borde_der_x - borde_izq_x)
    if ancho_cara == 0:
        return 0.0
    centro_cara_x = (borde_izq_x + borde_der_x) / 2.0
    desplazamiento = (nariz_x - centro_cara_x) / (ancho_cara / 2.0)
    return abs(desplazamiento) * 90.0

def detectar_gesto_señalar(pose_landmarks, w, h):
    lm = pose_landmarks
    señalando = False
    if (getattr(lm[12], 'visibility', 1.0) > 0.5 and getattr(lm[16], 'visibility', 1.0) > 0.5 and getattr(lm[20], 'visibility', 1.0) > 0.5):
        hombro_d = (lm[12].x * w, lm[12].y * h)
        muñeca_d = (lm[16].x * w, lm[16].y * h)
        indice_d = (lm[20].x * w, lm[20].y * h)
        if calcular_angulo_3puntos(hombro_d, muñeca_d, indice_d) > (180.0 - UMBRAL_ANGULO_SEÑALAR):
            señalando = True

    if (getattr(lm[11], 'visibility', 1.0) > 0.5 and getattr(lm[15], 'visibility', 1.0) > 0.5 and getattr(lm[19], 'visibility', 1.0) > 0.5):
        hombro_i = (lm[11].x * w, lm[11].y * h)
        muñeca_i = (lm[15].x * w, lm[15].y * h)
        indice_i = (lm[19].x * w, lm[19].y * h)
        if calcular_angulo_3puntos(hombro_i, muñeca_i, indice_i) > (180.0 - UMBRAL_ANGULO_SEÑALAR):
            señalando = True

    return señalando

def detectar_sonrisa(face_landmarks, w, h):
    """
    Detecta sonrisa usando la distancia horizontal entre comisuras
    (landmarks 61 y 291) normalizada por el ancho de la cara
    (landmarks 234 y 454).
    """
    lm = face_landmarks
    comisura_izq_x = lm[61].x * w
    comisura_der_x = lm[291].x * w
    borde_izq_x = lm[234].x * w
    borde_der_x = lm[454].x * w
    ancho_cara = abs(borde_der_x - borde_izq_x)
    if ancho_cara == 0:
        return 0.0
    dist_comisuras = abs(comisura_der_x - comisura_izq_x)
    return dist_comisuras / ancho_cara

def detectar_boca_abierta(face_landmarks, h):
    """
    Detecta boca abierta usando la distancia vertical entre labio superior
    (landmark 13) e inferior (landmark 14), normalizada por la altura de
    la cara (landmarks 10 — frente, 152 — mentón).
    """
    lm = face_landmarks
    labio_sup_y = lm[13].y * h
    labio_inf_y = lm[14].y * h
    frente_y = lm[10].y * h
    menton_y = lm[152].y * h
    altura_cara = abs(menton_y - frente_y)
    if altura_cara == 0:
        return 0.0
    apertura = abs(labio_inf_y - labio_sup_y)
    return apertura / altura_cara

def dibujar_vector_mirada(frame, face_landmarks, w, h):
    lm = face_landmarks
    for iris_idx, interna_idx, externa_idx, color in [
        (468, 362, 263, (0, 255, 0)),
        (473, 133, 33, (0, 200, 255)),
    ]:
        iris_x, iris_y = int(lm[iris_idx].x * w), int(lm[iris_idx].y * h)
        centro_ojo_x = (lm[interna_idx].x * w + lm[externa_idx].x * w) / 2.0
        
        if iris_idx == 468:
            sup_y, inf_y = lm[386].y * h, lm[374].y * h
        else:
            sup_y, inf_y = lm[159].y * h, lm[145].y * h
            
        centro_ojo_y = (sup_y + inf_y) / 2.0
        dx_raw = lm[iris_idx].x * w - centro_ojo_x
        dy_raw = lm[iris_idx].y * h - centro_ojo_y
        magnitud = math.sqrt(dx_raw**2 + dy_raw**2) + 1e-6
        dx = dx_raw / magnitud * 40
        dy = dy_raw / magnitud * 40

        cv2.circle(frame, (iris_x, iris_y), 2, color, -1)
        cv2.arrowedLine(frame, (iris_x, iris_y), (int(iris_x + dx), int(iris_y + dy)), color, 1, tipLength=0.3)


# ──────────────────────────────────────────────────────────────────────────────
# 4. ACUMULADORES Y LOOP PRINCIPAL
# ──────────────────────────────────────────────────────────────────────────────

frames_con_face = 0
frames_mirada_frente = 0
giros_de_cabeza = 0
estado_giro_anterior = False
frames_señalando = 0
frames_con_pose = 0
posiciones_hombros = []

# Nuevos acumuladores para A5, A7, A8
frames_sonrisa = 0            # A5: frames donde se detecta sonrisa
posiciones_muñecas = []       # A7: posiciones de muñecas para varianza
frames_boca_abierta = 0       # A8: frames donde la boca está abierta

print("  AUTISENSE — EXTRACCIÓN DE BIOMARCADORES")
print(f"\n  Iniciando captura de {DURACION_CAPTURA} segundos...")
print("  Presiona 'q' para cancelar manualmente.\n")

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("  ✗ ERROR: No se pudo abrir la cámara web.")
    sys.exit(1)

frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
tiempo_inicio = time.time()
frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1
    tiempo_transcurrido = time.time() - tiempo_inicio
    tiempo_restante = max(0, DURACION_CAPTURA - tiempo_transcurrido)

    if tiempo_transcurrido >= DURACION_CAPTURA:
        break

    # Convertir a RGB y crear mp.Image para la Tasks API
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    timestamp_ms = int(tiempo_transcurrido * 1000)

    # Procesar con Tasks API
    face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)
    # ImageProcessingOptions sin ROI fuerza a la API a usar las dimensiones reales del frame,
    # suprimiendo el warning "NORM_RECT without IMAGE_DIMENSIONS"
    pose_image_options = vision.ImageProcessingOptions()
    pose_result = pose_landmarker.detect_for_video(mp_image, timestamp_ms, pose_image_options)

    # ─── Análisis Face ──────────────────────────────────────────────────
    if face_result and face_result.face_landmarks:
        face_lm = face_result.face_landmarks[0]
        frames_con_face += 1

        # Dibujar Face Mesh completo (tesselation)
        mp_drawing.draw_landmarks(
            image=frame,
            landmark_list=face_lm,
            connections=vision.FaceLandmarksConnections.FACE_LANDMARKS_TESSELATION,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_tesselation_style())

        # Dibujar contorno del iris (ambos ojos)
        mp_drawing.draw_landmarks(
            image=frame,
            landmark_list=face_lm,
            connections=vision.FaceLandmarksConnections.FACE_LANDMARKS_RIGHT_IRIS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_iris_connections_style())
        mp_drawing.draw_landmarks(
            image=frame,
            landmark_list=face_lm,
            connections=vision.FaceLandmarksConnections.FACE_LANDMARKS_LEFT_IRIS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_iris_connections_style())

        # Métricas de mirada
        _, _, al_frente = estimar_gaze_ratio(face_lm, frame_w, frame_h)
        if al_frente: frames_mirada_frente += 1
        dibujar_vector_mirada(frame, face_lm, frame_w, frame_h)

        # Giro de cabeza
        angulo_giro = estimar_giro_cabeza(face_lm, frame_w, frame_h)
        giro_actual = angulo_giro > UMBRAL_GIRO_CABEZA_GRADOS
        if giro_actual and not estado_giro_anterior:
            giros_de_cabeza += 1
        estado_giro_anterior = giro_actual

        # A5: Detección de sonrisa
        ratio_sonrisa = detectar_sonrisa(face_lm, frame_w, frame_h)
        if ratio_sonrisa > UMBRAL_SONRISA:
            frames_sonrisa += 1

        # A8: Detección de boca abierta
        ratio_boca = detectar_boca_abierta(face_lm, frame_h)
        if ratio_boca > UMBRAL_BOCA_ABIERTA:
            frames_boca_abierta += 1

        # Texto de estado sobre el frame
        cv2.putText(frame, "MIRADA: FRENTE" if al_frente else "MIRADA: DESVIADA", 
                    (10, frame_h - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if al_frente else (0, 0, 255), 2)
        cv2.putText(frame, f"GIRO CABEZA: {angulo_giro:.1f} deg", 
                    (10, frame_h - 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 0), 2)

    # ─── Análisis Pose ──────────────────────────────────────────────────
    if pose_result and pose_result.pose_landmarks:
        pose_lm = pose_result.pose_landmarks[0]
        frames_con_pose += 1

        # Dibujar esqueleto completo de pose
        mp_drawing.draw_landmarks(
            image=frame,
            landmark_list=pose_lm,
            connections=vision.PoseLandmarksConnections.POSE_LANDMARKS,
            landmark_drawing_spec=None,
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(224, 224, 224), thickness=2))

        # Acumular posiciones de hombros para estabilidad postural
        if getattr(pose_lm[11], 'visibility', 1.0) > 0.5 and getattr(pose_lm[12], 'visibility', 1.0) > 0.5:
            posiciones_hombros.append((pose_lm[11].x, pose_lm[11].y, pose_lm[12].x, pose_lm[12].y))

        # A7: Acumular posiciones de muñecas para varianza de movimiento
        if getattr(pose_lm[15], 'visibility', 1.0) > 0.5 and getattr(pose_lm[16], 'visibility', 1.0) > 0.5:
            posiciones_muñecas.append((pose_lm[15].x, pose_lm[15].y, pose_lm[16].x, pose_lm[16].y))

        # Detección de gesto de señalar
        if detectar_gesto_señalar(pose_lm, frame_w, frame_h):
            frames_señalando += 1
            cv2.putText(frame, "GESTO: SENALANDO", (10, frame_h - 85), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)

    # ─── HUD ────────────────────────────────────────────────────────────
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (frame_w, 45), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)

    cv2.putText(frame, "AUTISENSE - EXTRACCION DE BIOMARCADORES", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

    barra_w = frame_w - 20
    cv2.rectangle(frame, (10, 48), (10 + barra_w, 55), (50, 50, 50), -1)

    cv2.imshow("AUTISENSE - Biomarcadores Demo", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# ─── Limpieza ───────────────────────────────────────────────────────────
cap.release()
cv2.destroyAllWindows()
face_landmarker.close()
pose_landmarker.close()

# Forzar recolección de basura antes del cierre del intérprete para
# evitar el error TypeError: 'NoneType' object is not callable en __del__
del face_landmarker
del pose_landmarker

duracion_real = time.time() - tiempo_inicio
print(f"\n  Duración real de captura: {duracion_real:.1f}s")
print(f"  Frames procesados: {frame_count}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. RESULTADOS Y DATAFRAME
# ──────────────────────────────────────────────────────────────────────────────

ratio_mirada_frente = frames_mirada_frente / frames_con_face if frames_con_face > 0 else 0.0
freq_giros = giros_de_cabeza / duracion_real if duracion_real > 0 else 0.0
ratio_señalando = frames_señalando / frames_con_pose if frames_con_pose > 0 else 0.0
varianza_postural = np.mean(np.var(np.array(posiciones_hombros), axis=0)) if len(posiciones_hombros) > 1 else 0.0
estabilidad_ok = varianza_postural < UMBRAL_VARIANZA_POSTURAL

# A5: Ratio de frames con sonrisa detectada
ratio_sonrisa_total = frames_sonrisa / frames_con_face if frames_con_face > 0 else 0.0

# A7: Varianza de posición de muñecas
varianza_muñecas = np.mean(np.var(np.array(posiciones_muñecas), axis=0)) if len(posiciones_muñecas) > 1 else 0.0

# A8: Ratio de frames con boca abierta
ratio_boca_abierta_total = frames_boca_abierta / frames_con_face if frames_con_face > 0 else 0.0

A1 = 1 if ratio_mirada_frente < 0.50 else 0
A2 = 1 if ratio_mirada_frente < 0.60 else 0
A3 = 1 if ratio_señalando < 0.02 else 0
A4 = 1 if ratio_señalando < 0.05 else 0

# A5: Expresión de sonrisa — si nunca sonrió (ratio < umbral) → riesgo
A5 = 0 if ratio_sonrisa_total > 0.10 else 1

A6 = 1 if freq_giros < 0.10 else 0

# A7: Imitación gestual — varianza de muñecas. Poca varianza → poco movimiento → riesgo
A7 = 0 if varianza_muñecas > UMBRAL_MOVIMIENTO_MANOS else 1

# A8: Respuesta social — mirada al frente + boca abierta (vocalización)
A8 = 0 if (ratio_mirada_frente > 0.40 and ratio_boca_abierta_total > UMBRAL_RATIO_BOCA_ABIERTA_FRAMES) else 1

A9 = 1 if ratio_señalando < 0.01 else 0
A10 = 1 if (estabilidad_ok and ratio_mirada_frente < 0.30) else 0

df_output = pd.DataFrame({
    "A1": [A1], "A2": [A2], "A3": [A3], "A4": [A4], "A5": [A5],
    "A6": [A6], "A7": [A7], "A8": [A8], "A9": [A9], "A10": [A10]
})

# ──────────────────────────────────────────────────────────────────────────────
# 5.5 RESUMEN DE MÉTRICAS BRUTAS
# ──────────────────────────────────────────────────────────────────────────────

print("\n")
print("  MÉTRICAS BRUTAS CAPTURADAS")
print(f"  ratio_mirada_frente    : {ratio_mirada_frente:.4f}  →  A1={A1}, A2={A2}")
print(f"  freq_giros_cabeza      : {freq_giros:.4f}  →  A6={A6}")
print(f"  ratio_señalando        : {ratio_señalando:.4f}  →  A3={A3}, A4={A4}, A9={A9}")
print(f"  ratio_sonrisa          : {ratio_sonrisa_total:.4f}  →  A5={A5}")
print(f"  varianza_muñecas       : {varianza_muñecas:.4f}  →  A7={A7}")
print(f"  ratio_boca_abierta     : {ratio_boca_abierta_total:.4f}  →  A8={A8}")
print(f"  varianza_postural      : {varianza_postural:.4f}  →  A10={A10}")

print("\n")
print("  DF DE SALIDA")
print(df_output.to_string(index=False))
