import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { correo, password } = (req.body ?? {}) as { correo?: string; password?: string };

  if (!correo || !password) {
    return res.status(400).json({ message: "correo y password requeridos" });
  }

  const correoClean = correo.trim().toLowerCase();

  try {
    const user = await prisma.usuario.findFirst({
      where: { correo: correoClean },
      include: { rol: true, clinica: true },
    });

    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });
    if (user.estado !== "activo") return res.status(403).json({ message: "Usuario no activo" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    const payload = {
      sub: String(user.id),
      role: user.rol.rol,
      clinicId: user.id_clinica ?? null,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        role: user.rol.rol,
        clinicId: user.id_clinica ?? null,
      },
    });
  } catch (e: any) {
    console.error("PRISMA ERROR:", e);
    return res.status(500).json({
      message: "Error en base de datos",
      code: e?.code ?? null,
      meta: e?.meta ?? null,
    });
  }
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ message: "refreshToken requerido" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ message: "refreshToken inválido" });
  }
});

authRouter.post("/logout", async (_req, res) => {
  return res.json({ ok: true });
});