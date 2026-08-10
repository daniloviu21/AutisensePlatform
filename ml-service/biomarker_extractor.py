import os
import math
import pandas as pd
import numpy as np
import urllib.request
# cv2 y mediapipe se importan de forma diferida (lazy) dentro de la función
# para evitar consumir RAM al arrancar el servidor FastAPI.

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTES Y CONFIGURACIÓN
# ──────────────────────────────────────────────────────────────────────────────
MP_DETECTION_CONF = 0.5
MP_TRACKING_CONF = 0.5

UMBRAL_GAZE_DESVIACION = 0.30
UMBRAL_GIRO_CABEZA_GRADOS = 20.0
UMBRAL_ANGULO_SEÑALAR = 30.0
UMBRAL_VARIANZA_POSTURAL = 0.005

UMBRAL_SONRISA = 0.45
UMBRAL_MOVIMIENTO_MANOS = 0.003
UMBRAL_BOCA_ABIERTA = 0.05
UMBRAL_RATIO_BOCA_ABIERTA_FRAMES = 0.10

FACE_MODEL_PATH = "face_landmarker.task"
POSE_MODEL_PATH = "pose_landmarker_lite.task"

# ──────────────────────────────────────────────────────────────────────────────
# FUNCIONES AUXILIARES DE GEOMETRÍA
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


# ──────────────────────────────────────────────────────────────────────────────
# FUNCIÓN PRINCIPAL DE EXTRACCIÓN
# ──────────────────────────────────────────────────────────────────────────────

def download_model(url, filename):
    if not os.path.exists(filename):
        urllib.request.urlretrieve(url, filename)

def init_landmarkers():
    # Import diferido: mediapipe solo se carga en RAM cuando se recibe la primera peticion
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision

    download_model("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", FACE_MODEL_PATH)
    download_model("https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", POSE_MODEL_PATH)

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
    
    return face_landmarker, pose_landmarker

def extraer_qchat_de_video(ruta_video: str, edad_meses: int, sexo: str, etnia: str, ictericia: str, familiar_asd: str) -> pd.DataFrame:
    """
    Analiza el video con MediaPipe, extrae los biomarcadores conductuales, 
    calcula A1-A10, y los devuelve en un DataFrame junto con los demográficos.
    """
    # Import diferido: cv2 y mediapipe solo se cargan en RAM cuando se recibe la primera peticion
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import vision

    face_landmarker, pose_landmarker = init_landmarkers()

    cap = cv2.VideoCapture(ruta_video)
    if not cap.isOpened():
        raise Exception(f"No se pudo abrir el video en {ruta_video}")

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or np.isnan(fps):
        fps = 30.0

    frames_con_face = 0
    frames_mirada_frente = 0
    giros_de_cabeza = 0
    estado_giro_anterior = False
    frames_señalando = 0
    frames_con_pose = 0
    posiciones_hombros = []
    
    frames_sonrisa = 0
    posiciones_muñecas = []
    frames_boca_abierta = 0

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        timestamp_ms = int((frame_count / fps) * 1000)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        face_result = face_landmarker.detect_for_video(mp_image, timestamp_ms)
        pose_image_options = vision.ImageProcessingOptions()
        pose_result = pose_landmarker.detect_for_video(mp_image, timestamp_ms, pose_image_options)

        # ── Face ──
        if face_result and face_result.face_landmarks:
            face_lm = face_result.face_landmarks[0]
            frames_con_face += 1

            _, _, al_frente = estimar_gaze_ratio(face_lm, frame_w, frame_h)
            if al_frente: frames_mirada_frente += 1

            angulo_giro = estimar_giro_cabeza(face_lm, frame_w, frame_h)
            giro_actual = angulo_giro > UMBRAL_GIRO_CABEZA_GRADOS
            if giro_actual and not estado_giro_anterior:
                giros_de_cabeza += 1
            estado_giro_anterior = giro_actual

            ratio_sonrisa = detectar_sonrisa(face_lm, frame_w, frame_h)
            if ratio_sonrisa > UMBRAL_SONRISA:
                frames_sonrisa += 1

            ratio_boca = detectar_boca_abierta(face_lm, frame_h)
            if ratio_boca > UMBRAL_BOCA_ABIERTA:
                frames_boca_abierta += 1

        # ── Pose ──
        if pose_result and pose_result.pose_landmarks:
            pose_lm = pose_result.pose_landmarks[0]
            frames_con_pose += 1

            if getattr(pose_lm[11], 'visibility', 1.0) > 0.5 and getattr(pose_lm[12], 'visibility', 1.0) > 0.5:
                posiciones_hombros.append((pose_lm[11].x, pose_lm[11].y, pose_lm[12].x, pose_lm[12].y))

            if getattr(pose_lm[15], 'visibility', 1.0) > 0.5 and getattr(pose_lm[16], 'visibility', 1.0) > 0.5:
                posiciones_muñecas.append((pose_lm[15].x, pose_lm[15].y, pose_lm[16].x, pose_lm[16].y))

            if detectar_gesto_señalar(pose_lm, frame_w, frame_h):
                frames_señalando += 1

    cap.release()
    face_landmarker.close()
    pose_landmarker.close()

    duracion_real = frame_count / fps if fps > 0 else 0

    # ── Calcular Métricas y A1-A10 ──
    ratio_mirada_frente = frames_mirada_frente / frames_con_face if frames_con_face > 0 else 0.0
    freq_giros = giros_de_cabeza / duracion_real if duracion_real > 0 else 0.0
    ratio_señalando = frames_señalando / frames_con_pose if frames_con_pose > 0 else 0.0
    varianza_postural = np.mean(np.var(np.array(posiciones_hombros), axis=0)) if len(posiciones_hombros) > 1 else 0.0
    estabilidad_ok = varianza_postural < UMBRAL_VARIANZA_POSTURAL

    ratio_sonrisa_total = frames_sonrisa / frames_con_face if frames_con_face > 0 else 0.0
    varianza_muñecas = np.mean(np.var(np.array(posiciones_muñecas), axis=0)) if len(posiciones_muñecas) > 1 else 0.0
    ratio_boca_abierta_total = frames_boca_abierta / frames_con_face if frames_con_face > 0 else 0.0

    A1 = 1 if ratio_mirada_frente < 0.50 else 0
    A2 = 1 if ratio_mirada_frente < 0.60 else 0
    A3 = 1 if ratio_señalando < 0.02 else 0
    A4 = 1 if ratio_señalando < 0.05 else 0
    A5 = 0 if ratio_sonrisa_total > 0.10 else 1
    A6 = 1 if freq_giros < 0.10 else 0
    A7 = 0 if varianza_muñecas > UMBRAL_MOVIMIENTO_MANOS else 1
    A8 = 0 if (ratio_mirada_frente > 0.40 and ratio_boca_abierta_total > UMBRAL_RATIO_BOCA_ABIERTA_FRAMES) else 1
    A9 = 1 if ratio_señalando < 0.01 else 0
    A10 = 1 if (estabilidad_ok and ratio_mirada_frente < 0.30) else 0

    # Retornar el DataFrame
    # IMPORTANTE: las columnas deben llamarse exactamente como las espera el preprocesador
    df = pd.DataFrame({
        "A1": [A1], "A2": [A2], "A3": [A3], "A4": [A4], "A5": [A5],
        "A6": [A6], "A7": [A7], "A8": [A8], "A9": [A9], "A10": [A10],
        "Sex": [sexo],
        "Ethnicity": [etnia],
        "Jaundice": [ictericia],
        "Family_mem_with_ASD": [familiar_asd],
        "Age_Mons": [edad_meses]
    })

    return df

