import { Router } from "express";
import { requireAuth, allowRoles } from "../../middlewares/auth";
import { simularAnalisis, getHistorialAnalisis, getAnalisisById, guardarObservaciones } from "./analisis.controller";

const router = Router();

// Only professionals can access this module
router.use(requireAuth);
router.use(allowRoles("profesional"));

// 1. Save simulated analysis result
router.post("/simular", simularAnalisis);

// 2. Get history of analysis
router.get("/", getHistorialAnalisis);

// 3. Get specific analysis
router.get("/:id", getAnalisisById);

// 4. Update observations
router.patch("/:id/observaciones", guardarObservaciones);

export { router as analisisRouter };
