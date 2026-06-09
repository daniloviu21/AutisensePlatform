import { Router } from "express";
import { requireAuth, allowRoles } from "../../middlewares/auth";
import { upload } from "../../middlewares/upload";
import { uploadVideo } from "../../middlewares/upload";
import { prisma } from "../../db/prisma";
import { logAudit } from "../../utils/audit";
import logger from "../../utils/logger";
import {
    simularAnalisis, getHistorialAnalisis,
    getAnalisisById, guardarObservaciones,
} from "./analisis.controller";
import { procesarVideoYPredecir } from "./analisis.service";

const router = Router();

router.use(requireAuth);
router.use(allowRoles("profesional", "clinic_admin"));

// ── Legado / mock ──────────────────────────────────────────────────────────────
router.post("/simular", simularAnalisis);
router.get("/", getHistorialAnalisis);
router.get("/:id", getAnalisisById);
router.patch("/:id/observaciones", guardarObservaciones);

// ── NUEVO: crea encuentro + sube video + predice en un solo paso ──────────────
//
// Body (multipart/form-data):
//   video        — archivo de video (requerido)
//   pacienteId   — número
//   tipoEncuentro — string
//   fecha        — string ISO (YYYY-MM-DD)
//   motivo       — string
//   contexto     — string (opcional)
//
// Response 200:
//   { analisis_id, encuentro_id, prediccion, probabilidad, confianza,
//     metricas: {auc, f1, log_loss}, tiempo_ms, advertencias }
//
router.post(
    "/nuevo",
    uploadVideo.single("video"),
    async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: "Se requiere un archivo de video." });
        }

        const { pacienteId, tipoEncuentro, fecha, motivo, contexto } = req.body;

        if (!pacienteId) {
            return res.status(400).json({ message: "Se requiere pacienteId." });
        }

        const idPaciente = Number(pacienteId);
        if (isNaN(idPaciente)) {
            return res.status(400).json({ message: "pacienteId inválido." });
        }

        try {
            // 1. Verificar que el paciente existe
            const paciente = await prisma.paciente.findUnique({ where: { id: idPaciente } });
            if (!paciente) {
                return res.status(404).json({ message: "Paciente no encontrado." });
            }

        // 2. Resolver ID de Profesional (tabla profesionales, distinto del usuario)
            const usuarioConProfesional = await prisma.usuario.findUnique({
                where: { id: Number(req.user!.sub) },
                include: { profesional: true },
            });

            const idProfesional =
                usuarioConProfesional?.profesional?.id ??
                (await prisma.profesional.findFirst({ where: { id_clinica: paciente.id_clinica } }))?.id;

            if (!idProfesional) {
                return res.status(400).json({ message: "No se encontró un profesional asociado a esta clínica." });
            }

            // 3. Crear el Encuentro
            const encuentro = await prisma.encuentro.create({
                data: {
                    id_paciente: idPaciente,
                    id_profesional: idProfesional,
                    tipo_encuentro: tipoEncuentro || "consulta",
                    fecha: fecha ? new Date(fecha) : new Date(),
                    motivo: motivo || "Análisis de video TEA",
                    resumen: contexto || null,
                },
            });

            // 3. Crear el registro Archivo
            const archivo = await prisma.archivo.create({
                data: {
                    id_paciente: idPaciente,
                    id_encuentro: encuentro.id,
                    nombre_archivo: req.file.originalname,
                    tipo_mime: req.file.mimetype,
                    tamano_bytes: req.file.size,
                    descripcion: "Sesión de análisis TEA",
                    subido_por_id: Number(req.user!.sub),
                },
            });

            // 4. Calcular edad y género para el modelo
            const edad_meses = Math.floor(
                (Date.now() - new Date(paciente.fecha_nacimiento).getTime())
                / (1000 * 60 * 60 * 24 * 30.44)
            );

            // 5. Llamar al ML service real
            const analisis = await procesarVideoYPredecir({
                id_archivo: archivo.id,
                ruta_video_temp: req.file.path,
                nombre_archivo: req.file.originalname,
                edad_meses,
                genero_masculino: paciente.sexo === "M" ? 1 : 0,
            });

            logAudit(prisma, {
                userId: Number(req.user!.sub), userRole: req.user!.role,
                action: "VIDEO_ANALIZADO", entity: "AnalisisIA",
                entityId: analisis.id, ip: req.ip, statusCode: 200,
            });

            return res.status(200).json({
                analisis_id: analisis.id,
                encuentro_id: encuentro.id,
                prediccion: analisis.clasificacion,
                probabilidad: analisis.probabilidad_asd,
                confianza: analisis.confianza,
                metricas: {
                    auc: analisis.auc_modelo,
                    f1: analisis.f1_macro,
                    log_loss: analisis.log_loss,
                },
                tiempo_ms: analisis.tiempo_total_ms,
                advertencias: analisis.advertencias,
            });

        } catch (error) {
            logger.error("POST /analisis/nuevo", { err: String(error) });
            return res.status(500).json({ message: "Error procesando el video. Intenta de nuevo." });
        }
    }
);

// ── Por encuentro existente (mantener compatibilidad) ─────────────────────────
router.post(
    "/encuentros/:id_encuentro/analizar",
    uploadVideo.single("video"),
    async (req, res) => {
        const { id_encuentro } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "Se requiere un archivo de video" });
        }

        try {
            const encuentro = await prisma.encuentro.findUnique({
                where: { id: Number(id_encuentro) },
                include: { paciente: true },
            });

            if (!encuentro) return res.status(404).json({ message: "Encuentro no encontrado" });

            const archivo = await prisma.archivo.create({
                data: {
                    id_paciente: encuentro.id_paciente,
                    id_encuentro: encuentro.id,
                    nombre_archivo: req.file.originalname,
                    tipo_mime: req.file.mimetype,
                    tamano_bytes: req.file.size,
                    descripcion: "Sesión de análisis TEA",
                    subido_por_id: Number(req.user!.sub),
                },
            });

            const edad_meses = Math.floor(
                (Date.now() - new Date(encuentro.paciente.fecha_nacimiento).getTime())
                / (1000 * 60 * 60 * 24 * 30.44)
            );

            const analisis = await procesarVideoYPredecir({
                id_archivo: archivo.id,
                ruta_video_temp: req.file.path,
                nombre_archivo: req.file.originalname,
                edad_meses,
                genero_masculino: encuentro.paciente.sexo === "M" ? 1 : 0,
            });

            logAudit(prisma, {
                userId: Number(req.user!.sub), userRole: req.user!.role,
                action: "VIDEO_ANALIZADO", entity: "AnalisisIA",
                entityId: analisis.id, ip: req.ip, statusCode: 200,
            });

            return res.status(200).json({
                archivo_id: archivo.id,
                analisis_id: analisis.id,
                prediccion: analisis.clasificacion,
                probabilidad: analisis.probabilidad_asd,
                confianza: analisis.confianza,
                metricas: {
                    auc: analisis.auc_modelo,
                    f1: analisis.f1_macro,
                    log_loss: analisis.log_loss,
                },
                tiempo_ms: analisis.tiempo_total_ms,
                advertencias: analisis.advertencias,
            });

        } catch (error) {
            logger.error("POST /analisis/encuentros/:id/analizar", { err: String(error) });
            return res.status(500).json({ message: "Error procesando el video. Intenta de nuevo." });
        }
    }
);

export { router as analisisRouter };