import fs from "fs";
import { prisma } from "../../db/prisma";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://ml-service:8000";

const METRICAS_MODELO = {
    auc_modelo: 0.893,
    log_loss: 0.420,
    f1_macro: 0.718,
};

export async function procesarVideoYPredecir(opciones: {
    id_archivo: number;
    ruta_video_temp: string;
    nombre_archivo: string;
    edad_meses?: number;
    genero_masculino?: number;
}) {
    const {
        id_archivo, ruta_video_temp, nombre_archivo,
        edad_meses = 0, genero_masculino = 0,
    } = opciones;

    await prisma.analisisIA.upsert({
        where: { id_archivo },
        create: { id_archivo, estado: "procesando" },
        update: { estado: "procesando", error_msg: null },
    });

    try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(ruta_video_temp);
        const blob = new Blob([fileBuffer]);
        formData.append("video", blob, nombre_archivo);
        formData.append("edad_meses", String(edad_meses));
        formData.append("genero_masculino", String(genero_masculino));

        const respuesta = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(120_000),
        });

        if (!respuesta.ok) {
            const error = await respuesta.text();
            throw new Error(`ML service error ${respuesta.status}: ${error}`);
        }

        const resultado = await respuesta.json() as any;

        return await prisma.analisisIA.update({
            where: { id_archivo },
            data: {
                estado: "completado",
                clasificacion: resultado.prediccion,
                probabilidad_asd: resultado.probabilidad_asd,
                score: resultado.probabilidad_asd,
                confianza: resultado.confianza,
                umbral_usado: resultado.umbral_usado,
                auc_modelo: METRICAS_MODELO.auc_modelo,
                log_loss: METRICAS_MODELO.log_loss,
                f1_macro: METRICAS_MODELO.f1_macro,
                tiempo_extraccion_ms: resultado.tiempo_extraccion_ms,
                tiempo_total_ms: resultado.tiempo_total_ms,
                modelo: resultado.modelo,
                modelo_version: "v2",
                features_json: resultado.features,
                advertencias: resultado.advertencias,
            },
        });

    } catch (error: any) {
        await prisma.analisisIA.update({
            where: { id_archivo },
            data: { estado: "error", error_msg: error.message },
        });
        throw error;
    } finally {
        if (fs.existsSync(ruta_video_temp)) fs.unlinkSync(ruta_video_temp);
    }
}