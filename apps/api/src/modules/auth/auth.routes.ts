import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { prisma } from "../../db/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { requireAuth } from "../../middlewares/auth";
import { sendMfaCode } from "../../utils/mailer";
import logger from "../../utils/logger";
import { logAudit } from "../../utils/audit";

export const authRouter = Router();

// ─── Rate limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 5 minutos." },
  skipSuccessfulRequests: true,
});

const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Intenta de nuevo en 15 minutos." },
});

const mfaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiados intentos de verificación. Intenta de nuevo en 15 minutos." },
});

const mfaResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Demasiados reenvíos solicitados. Intenta de nuevo en 15 minutos." },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
const MFA_OTP_TTL_MIN  = Number(process.env.MFA_OTP_TTL_MIN ?? 10);

async function saveRefreshToken(userId: number, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
}

/** Genera un OTP numérico de 6 dígitos */
function generateOtp(): string {
  return String(crypto.randomInt(100_000, 999_999));
}

/** Crea y persiste un MfaChallenge, devuelve id y código en claro */
async function createMfaChallenge(userId: number) {
  // Invalida challenges previos no usados del mismo usuario
  await prisma.mfaChallenge.updateMany({
    where: { userId, used: false },
    data: { used: true },
  });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + MFA_OTP_TTL_MIN * 60 * 1000);

  const challenge = await prisma.mfaChallenge.create({
    data: { userId, codeHash: hashToken(code), expiresAt },
  });

  return { challengeId: challenge.id, code };
}

/** Borra todos los MfaChallenges expirados (fire-and-forget) */
export async function purgeExpiredMfaChallenges() {
  try {
    const { count } = await prisma.mfaChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) console.log(`[auth] Purgados ${count} MFA challenge(s) expirado(s).`);
  } catch (e) {
    console.error("[auth] Error purgando MFA challenges:", e);
  }
}

/** Borra todos los RefreshTokens expirados (fire-and-forget) */
export async function purgeExpiredRefreshTokens() {
  try {
    const { count } = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) console.log(`[auth] Purgados ${count} refresh token(s) expirado(s).`);
  } catch (e) {
    console.error("[auth] Error purgando refresh tokens:", e);
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

authRouter.post("/login", loginLimiter, async (req, res) => {
  const { correo, password } = (req.body ?? {}) as {
    correo?: string;
    password?: string;
  };

  if (!correo || !password) {
    return res.status(400).json({ message: "correo y password requeridos" });
  }

  const correoClean = correo.trim().toLowerCase();

  try {
    const user = await prisma.usuario.findFirst({
      where: { correo: correoClean },
      include: { rol: true, clinica: true },
    });

    if (!user) {
      logAudit(prisma, { action: "LOGIN_FAIL", userEmail: correoClean, detail: "usuario no encontrado", ip: req.ip, statusCode: 401 });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.estado !== "activo") {
      logAudit(prisma, { userId: user.id, userEmail: user.correo, userRole: user.rol.rol, action: "LOGIN_FAIL", detail: "usuario inactivo", ip: req.ip, statusCode: 403 });
      return res.status(403).json({ message: "Usuario no activo" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      logAudit(prisma, { userId: user.id, userEmail: user.correo, userRole: user.rol.rol, action: "LOGIN_FAIL", detail: "contraseña incorrecta", ip: req.ip, statusCode: 401 });
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // ── MFA habilitado → emitir challenge, NO tokens ──────────────────────────
    if (user.mfaEnabled) {
      // Verificar si hay un bloqueo temporal activo antes de enviar el correo
      const lockedChallenge = await prisma.mfaChallenge.findFirst({
        where: {
          userId: user.id,
          lockedUntil: { gt: new Date() },
        },
      });

      if (lockedChallenge) {
        return res.status(423).json({
          code: "LOCKED",
          message:
            "Demasiados intentos. Tu cuenta está bloqueada temporalmente. Intenta en 5 minutos.",
          lockedUntil: lockedChallenge.lockedUntil!.toISOString(),
        });
      }

      const { challengeId, code } = await createMfaChallenge(user.id);
      await sendMfaCode(user.correo, code);
      logAudit(prisma, { userId: user.id, userEmail: user.correo, userRole: user.rol.rol, action: "LOGIN_MFA_PENDING", ip: req.ip, statusCode: 200 });
      return res.json({ requiresMfa: true, challengeId });
    }

    // ── Login directo (sin MFA) ───────────────────────────────────────────────
    const payload = {
      sub: String(user.id),
      role: user.rol.rol,
      clinicId: user.id_clinica ?? null,
    };

    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await saveRefreshToken(user.id, refreshToken);
    logAudit(prisma, { userId: user.id, userEmail: user.correo, userRole: user.rol.rol, action: "LOGIN_OK", detail: "login sin MFA", ip: req.ip, statusCode: 200 });

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        role: user.rol.rol,
        clinicId: user.id_clinica ?? null,
        mustChangePassword: user.must_change_password,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (e: any) {
    logger.error("POST /auth/login error", { err: e?.message ?? e });
    return res.status(500).json({
      message: "Error en base de datos",
      code: e?.code ?? null,
      meta: e?.meta ?? null,
    });
  }
});

// ─── POST /auth/mfa/verify ────────────────────────────────────────────────────

authRouter.post("/mfa/verify", mfaVerifyLimiter, async (req, res) => {
  const { challengeId, code } = (req.body ?? {}) as {
    challengeId?: string;
    code?: string;
  };

  if (!challengeId || !code) {
    return res.status(400).json({ message: "challengeId y code son requeridos" });
  }

  // Validación básica del formato del código
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: "El código debe tener 6 dígitos numéricos" });
  }

  try {
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: { usuario: { include: { rol: true } } },
    });

    if (!challenge) {
      return res.status(401).json({ code: "INVALID_CHALLENGE", message: "Código inválido o expirado" });
    }

    if (challenge.used) {
      return res.status(401).json({ code: "USED_CHALLENGE", message: "Este código ya fue utilizado" });
    }

    if (challenge.expiresAt < new Date()) {
      return res.status(401).json({ code: "EXPIRED", message: "El código ha expirado. Solicita uno nuevo." });
    }

    if (challenge.lockedUntil && challenge.lockedUntil > new Date()) {
      return res.status(423).json({
        code: "LOCKED",
        message: "Demasiados intentos. Intenta nuevamente en 5 minutos.",
        lockedUntil: challenge.lockedUntil.toISOString(),
      });
    }

    // Reset lock si expiró la penalización
    if (challenge.lockedUntil && challenge.lockedUntil <= new Date()) {
      await prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: { failedAttempts: 0, lockedUntil: null },
      });
      challenge.failedAttempts = 0;
    }

    const codeMatch = challenge.codeHash === hashToken(code);

    if (!codeMatch) {
      const newAttempts = challenge.failedAttempts + 1;
      
      if (newAttempts >= 5) {
        const lockTime = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.mfaChallenge.update({
          where: { id: challengeId },
          data: { failedAttempts: newAttempts, lockedUntil: lockTime },
        });
        logAudit(prisma, { userId: challenge.userId, action: "MFA_LOCKED", detail: `bloqueado tras ${newAttempts} intentos`, ip: req.ip, statusCode: 423 });
        return res.status(423).json({
          code: "LOCKED",
          message: "Demasiados intentos. Intenta nuevamente en 5 minutos.",
          lockedUntil: lockTime.toISOString(),
        });
      } else {
        await prisma.mfaChallenge.update({
          where: { id: challengeId },
          data: { failedAttempts: newAttempts },
        });
        logAudit(prisma, { userId: challenge.userId, action: "MFA_FAIL", detail: `intento ${newAttempts}/5`, ip: req.ip, statusCode: 401 });
        const remaining = 5 - newAttempts;
        return res.status(401).json({
          code: "INCORRECT_CODE",
          message: "Código incorrecto.",
          remainingAttempts: remaining,
        });
      }
    }

    // ── Código correcto → consumir challenge y emitir tokens ─────────────────
    await prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { used: true },
    });

    const user = challenge.usuario;

    if (user.estado !== "activo") {
      return res.status(403).json({ message: "Usuario no activo" });
    }

    const payload = {
      sub: String(user.id),
      role: user.rol.rol,
      clinicId: user.id_clinica ?? null,
    };

    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await saveRefreshToken(user.id, refreshToken);
    logAudit(prisma, { userId: user.id, userEmail: user.correo, userRole: user.rol.rol, action: "LOGIN_OK", detail: "login via MFA", ip: req.ip, statusCode: 200 });

    // Limpieza oportunista
    void purgeExpiredMfaChallenges();

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        role: user.rol.rol,
        clinicId: user.id_clinica ?? null,
        mustChangePassword: user.must_change_password,
        mfaEnabled: user.mfaEnabled,
      },
    });
  } catch (e: any) {
    logger.error("POST /auth/mfa/verify error", { err: e?.message ?? e });
    return res.status(500).json({ message: "Error al verificar el código" });
  }
});

// ─── POST /auth/mfa/resend ────────────────────────────────────────────────────

authRouter.post("/mfa/resend", mfaResendLimiter, async (req, res) => {
  const { challengeId } = (req.body ?? {}) as { challengeId?: string };

  if (!challengeId) {
    return res.status(400).json({ message: "challengeId es requerido" });
  }

  try {
    const existing = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: { usuario: true },
    });

    if (!existing || existing.used) {
      return res.status(400).json({ message: "Challenge inválido o ya utilizado" });
    }

    const user = existing.usuario;

    if (user.estado !== "activo") {
      return res.status(403).json({ message: "Usuario no activo" });
    }

    // Crea un nuevo challenge (invalida el anterior internamente)
    const { challengeId: newChallengeId, code } = await createMfaChallenge(user.id);
    await sendMfaCode(user.correo, code);

    return res.json({ challengeId: newChallengeId });
  } catch (e: any) {
    logger.error("POST /auth/mfa/resend error", { err: e?.message ?? e });
    return res.status(500).json({ message: "No se pudo reenviar el código" });
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

authRouter.post("/refresh", authActionLimiter, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    return res.status(400).json({ message: "refreshToken requerido" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: "refreshToken inválido" });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: Number(payload.sub) },
      include: { rol: true },
    });

    if (!user || user.estado !== "activo") {
      return res.status(401).json({ message: "refreshToken inválido" });
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newPayload = {
      sub: String(user.id),
      role: user.rol.rol,
      clinicId: user.id_clinica ?? null,
    };

    const newAccessToken  = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    await saveRefreshToken(user.id, newRefreshToken);

    void purgeExpiredRefreshTokens();

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        correo: user.correo,
        role: user.rol.rol,
        clinicId: user.id_clinica ?? null,
        mustChangePassword: user.must_change_password,
      },
    });
  } catch {
    return res.status(401).json({ message: "refreshToken inválido" });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

authRouter.post("/logout", requireAuth, async (req, res) => {
  const userId = Number(req.user?.sub);
  await prisma.refreshToken.deleteMany({ where: { userId } });
  return res.json({ ok: true });
});

// ─── POST /auth/change-password ───────────────────────────────────────────────

authRouter.post("/change-password", authActionLimiter, requireAuth, async (req, res) => {
  const userId = Number(req.user?.sub);

  const { currentPassword, newPassword, confirmPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!Number.isFinite(userId)) {
    return res.status(401).json({ message: "No auth" });
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      message: "currentPassword, newPassword y confirmPassword son requeridos",
    });
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({ message: "La nueva contraseña debe tener entre 8 y 72 caracteres" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Las contraseñas no coinciden" });
  }

  try {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      return res.status(400).json({ message: "La contraseña actual no es correcta" });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsCurrent) {
      return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { password_hash: newHash, must_change_password: false },
      include: { rol: true },
    });

    const newPayload = {
      sub: String(updated.id),
      role: updated.rol.rol,
      clinicId: updated.id_clinica ?? null,
    };

    const accessToken  = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.deleteMany({ where: { userId: updated.id } });
    await saveRefreshToken(updated.id, refreshToken);

    return res.json({
      message: "Contraseña actualizada correctamente",
      accessToken,
      refreshToken,
      user: {
        id: updated.id,
        correo: updated.correo,
        role: updated.rol.rol,
        clinicId: updated.id_clinica ?? null,
        mustChangePassword: updated.must_change_password,
      },
    });
  } catch (error) {
    logger.error("POST /auth/change-password error", { err: String(error) });
    return res.status(500).json({ message: "No se pudo actualizar la contraseña" });
  }
});