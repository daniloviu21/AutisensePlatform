import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";

import { authRouter, purgeExpiredRefreshTokens, purgeExpiredMfaChallenges } from "./modules/auth/auth.routes";
import { meRouter } from "./modules/auth/me.routes";
import { clinicasRouter } from "./modules/clinicas/clinicas.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { profesionalesRouter } from "./modules/profesionales/profesionales.routes";
import { pacientesRouter } from "./modules/pacientes/pacientes.routes";
import { tutoresRouter } from "./modules/tutores/tutores.routes";
import { auditLogsRouter } from "./modules/audit/audit-logs.routes";
import logger from "./utils/logger";
import { swaggerSpec } from "./docs/swagger";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/clinicas", clinicasRouter);
app.use("/usuarios", usuariosRouter);
app.use("/profesionales", profesionalesRouter);
app.use("/pacientes", pacientesRouter);
app.use("/tutores", tutoresRouter);
app.use("/audit-logs", auditLogsRouter);

// ─── Swagger API Docs (sin autenticación) ────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "AutiSense API Docs",
    swaggerOptions: { persistAuthorization: true },
  })
);
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

const port = Number(process.env.PORT ?? 4000);
app.use((error: any, _req: any, res: any, _next: any) => {
  if (error?.message?.includes("Formato de imagen no permitido")) {
    return res.status(400).json({ message: error.message });
  }

  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "La imagen no debe exceder 5 MB." });
  }

  logger.error("Unhandled error", { err: String(error) });
  return res.status(500).json({ message: "Error interno del servidor" });
});
app.listen(port, () => {
  logger.info(`API running on http://localhost:${port}`);

  // Limpieza inicial + periódica cada 6 h
  void purgeExpiredMfaChallenges();
  void purgeExpiredRefreshTokens();
  setInterval(() => {
    void purgeExpiredRefreshTokens();
    void purgeExpiredMfaChallenges();
  }, 6 * 60 * 60 * 1000);
});
