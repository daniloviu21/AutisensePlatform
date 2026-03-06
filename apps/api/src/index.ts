import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { authRouter } from "./modules/auth/auth.routes";
import { clinicasRouter } from "./modules/clinicas/clinicas.routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/clinicas", clinicasRouter);

app.use((_req, res) => res.status(404).json({ message: "Not found" }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));