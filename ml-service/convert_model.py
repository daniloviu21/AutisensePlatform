"""
Script para convertir el modelo Keras 3 (.keras) a formato H5 (.h5)
compatible con TensorFlow 2.15 / Keras 2.

Ejecutar localmente donde se tenga Keras 3 instalado:
    python convert_model.py
"""
import os
import tensorflow as tf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KERAS3_PATH = os.path.join(BASE_DIR, "modeloautisense", "asd_classifier.keras")
H5_OUTPUT   = os.path.join(BASE_DIR, "modelo", "asd_classifier.h5")

print(f"TensorFlow version: {tf.__version__}")
print(f"Keras version: {tf.keras.__version__}")

print(f"\nCargando modelo desde: {KERAS3_PATH}")
model = tf.keras.models.load_model(KERAS3_PATH)
model.summary()

os.makedirs(os.path.dirname(H5_OUTPUT), exist_ok=True)

print(f"\nGuardando en formato H5: {H5_OUTPUT}")
model.save(H5_OUTPUT)
print("¡Conversión completada exitosamente!")
