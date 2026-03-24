import { Router } from "express";
import * as controller from "./suscripciones.controller";
import { allowRoles, requireAuth } from "../../middlewares/auth";

const router = Router();

// Todas estas rutas requieren estar autenticado
router.use(requireAuth);

// Solo clinic_admin y super_admin pueden ver/gestionar suscripciones
router.get(
  "/mi-clinica",
  allowRoles("clinic_admin", "super_admin"),
  controller.getSuscripcionMiClinica
);

router.get(
  "/pagos",
  allowRoles("clinic_admin", "super_admin"),
  controller.getHistorialPagos
);

router.get(
  "/admin",
  allowRoles("super_admin"),
  controller.getSuscripcionesAdmin
);

router.get(
  "/admin/:id",
  allowRoles("super_admin"),
  controller.getSuscripcionByIdAdmin
);

export { router as suscripcionesRouter };

