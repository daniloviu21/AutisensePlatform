import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import logger from "../../utils/logger";
import { logAudit } from "../../utils/audit";

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

async function saveRefreshToken(userId: number, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });
}

export const crearSesion = async (req: Request, res: Response) => {
  try {
    const { plan_nombre, monto, moneda } = req.body;

    if (!plan_nombre || !monto) {
      return res.status(400).json({ message: "plan_nombre y monto son requeridos" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de expiración

    const session = await prisma.checkoutSession.create({
      data: {
        token,
        plan_nombre,
        monto: Number(monto),
        moneda: moneda || "MXN",
        estado: "pendiente",
        expires_at,
      },
    });

    return res.status(201).json(session);
  } catch (error) {
    logger.error("Error al crear sesión de checkout", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getSesion = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    const session = await prisma.checkoutSession.findUnique({
      where: { token },
    });

    if (!session) {
      return res.status(404).json({ message: "Sesión no encontrada" });
    }

    if (session.estado === "consumido") {
      return res.status(400).json({ message: "Esta sesión ya ha sido utilizada", code: "SESSION_CONSUMED" });
    }

    if (session.expires_at < new Date()) {
      return res.status(400).json({ message: "La sesión ha expirado", code: "SESSION_EXPIRED" });
    }

    return res.json(session);
  } catch (error) {
    logger.error("Error al obtener sesión de checkout", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const simularPago = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const { metodo, email_provisional } = req.body;

    const session = await prisma.checkoutSession.findUnique({
      where: { token },
    });

    if (!session || session.estado !== "pendiente") {
      return res.status(400).json({ message: "Sesión no válida para pago" });
    }

    const updated = await prisma.checkoutSession.update({
      where: { token },
      data: {
        estado: "pagado",
        metodo: metodo || "tarjeta",
        email_provisional: email_provisional || null,
      },
    });

    return res.json({ ok: true, estado: updated.estado });
  } catch (error) {
    logger.error("Error al simular pago", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const finalizarRegistro = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const {
      // Datos Clínica
      nombre_clinica,
      razon_social,
      rfc,
      telefono_clinica,
      correo_clinica,
      direccion,
      // Datos Usuario Admin
      nombre_admin,
      ap_paterno_admin,
      ap_materno_admin,
      correo_admin,
      password_admin,
    } = req.body;

    const session = await prisma.checkoutSession.findUnique({
      where: { token },
    });

    if (!session || session.estado !== "pagado") {
      return res.status(400).json({ message: "Pago no verificado o sesión inválida" });
    }

    if (session.consumed_at || session.expires_at < new Date()) {
      return res.status(400).json({ message: "Sesión expirada o ya consumida" });
    }

    // Validar que el correo no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { correo: correo_admin.trim().toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ message: "El correo electrónico ya está registrado" });
    }

    // Calcular fecha_fin de suscripción
    const fecha_inicio = new Date();
    const fecha_fin = new Date();
    if (session.plan_nombre.toLowerCase().includes("anual")) {
      fecha_fin.setFullYear(fecha_fin.getFullYear() + 1);
    } else {
      fecha_fin.setMonth(fecha_fin.getMonth() + 1);
    }

    const passwordHash = await bcrypt.hash(password_admin, 10);
    const roleAdmin = await prisma.role.findUnique({ where: { rol: "clinic_admin" } });

    if (!roleAdmin) {
      return res.status(500).json({ message: "Error de configuración de roles del sistema" });
    }

    // TRANSACCIÓN ATÓMICA
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Clínica
      const clinica = await tx.clinica.create({
        data: {
          nombre: nombre_clinica,
          razon_social,
          rfc,
          telefono: telefono_clinica,
          correo_contacto: correo_clinica,
          direccion,
        },
      });

      // 2. Crear Usuario Clinic Admin
      const usuario = await tx.usuario.create({
        data: {
          correo: correo_admin.trim().toLowerCase(),
          password_hash: passwordHash,
          id_rol: roleAdmin.id,
          id_clinica: clinica.id,
          estado: "activo",
        },
      });

      // 3. Crear Suscripción
      const suscripcion = await tx.suscripcion.create({
        data: {
          id_clinica: clinica.id,
          plan_nombre: session.plan_nombre,
          monto: session.monto,
          moneda: session.moneda,
          estado: "activa",
          fecha_inicio,
          fecha_fin,
        },
      });

      // 4. Crear Pago
      await tx.pago.create({
        data: {
          id_suscripcion: suscripcion.id,
          monto: session.monto,
          moneda: session.moneda,
          metodo: session.metodo || "tarjeta",
          estado: "pagado",
          fecha_pago: new Date(),
        },
      });

      // 5. Consumir Sesión
      await tx.checkoutSession.update({
        where: { id: session.id },
        data: {
          estado: "consumido",
          consumed_at: new Date(),
        },
      });

      return { usuario, clinica };
    });

    // LOGIN AUTOMÁTICO
    const payload = {
      sub: String(result.usuario.id),
      role: roleAdmin.rol,
      clinicId: result.clinica.id,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await saveRefreshToken(result.usuario.id, refreshToken);

    logAudit(prisma, {
      userId: result.usuario.id,
      userEmail: result.usuario.correo,
      userRole: roleAdmin.rol,
      action: "CLINIC_REGISTER_PUBLIC",
      entity: "Clinica",
      entityId: result.clinica.id,
      detail: `Plan: ${session.plan_nombre}`,
      ip: req.ip,
      statusCode: 201
    });

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: result.usuario.id,
        correo: result.usuario.correo,
        role: roleAdmin.rol,
        clinicId: result.clinica.id,
        mfaEnabled: false,
      },
    });

  } catch (error) {
    logger.error("Error en transacción de alta de clínica", { err: String(error) });
    return res.status(500).json({ message: "No se pudo completar el registro. Intenta más tarde." });
  }
};
