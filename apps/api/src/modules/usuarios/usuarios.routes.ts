import { Router } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { requireAuth, requireRole } from "../../middlewares/auth";

export const usuariosRouter = Router();

usuariosRouter.use(requireAuth, requireRole("super_admin"));

const VALID_ROLES = ["super_admin", "clinic_admin", "profesional", "tutor"] as const;
const VALID_STATES = ["activo", "suspendido", "pendiente"] as const;

type ValidRole = (typeof VALID_ROLES)[number];
type ValidState = (typeof VALID_STATES)[number];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isValidRole(value: string): value is ValidRole {
  return VALID_ROLES.includes(value as ValidRole);
}

function isValidState(value: string): value is ValidState {
  return VALID_STATES.includes(value as ValidState);
}

function sanitizeUserResponse(user: any) {
  return {
    id: user.id,
    correo: user.correo,
    estado: user.estado,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    rol: user.rol
      ? {
          id: user.rol.id,
          rol: user.rol.rol,
          descripcion: user.rol.descripcion ?? null,
        }
      : null,
    clinica: user.clinica
      ? {
          id: user.clinica.id,
          nombre: user.clinica.nombre,
          estado: user.clinica.estado,
        }
      : null,
    id_clinica: user.id_clinica ?? null,
    id_rol: user.id_rol,
  };
}

usuariosRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));

    const q = String(req.query.q ?? "").trim();
    const role = String(req.query.role ?? "").trim();
    const estado = String(req.query.estado ?? "").trim();
    const clinicaIdRaw = String(req.query.clinicaId ?? "").trim();

    const where: Prisma.UsuarioWhereInput = {};

    if (q.length > 0) {
      where.OR = [
        { correo: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { rol: { rol: { contains: q, mode: Prisma.QueryMode.insensitive } } },
        { clinica: { nombre: { contains: q, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    if (role.length > 0 && isValidRole(role)) {
      where.rol = {
        rol: role,
      };
    }

    if (estado.length > 0 && isValidState(estado)) {
      where.estado = estado;
    }

    if (clinicaIdRaw.length > 0) {
      const clinicaId = Number(clinicaIdRaw);
      if (!Number.isFinite(clinicaId)) {
        return res.status(400).json({ message: "clinicaId inválido" });
      }
      where.id_clinica = clinicaId;
    }

    const [total, items] = await Promise.all([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        include: {
          rol: true,
          clinica: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      page,
      pageSize,
      total,
      items: items.map(sanitizeUserResponse),
    });
  } catch (error) {
    console.error("GET /usuarios error:", error);
    return res.status(500).json({ message: "No se pudieron obtener los usuarios" });
  }
});

usuariosRouter.post("/", async (req, res) => {
  try {
    const {
      correo,
      password,
      estado,
      role,
      clinicaId,
    } = (req.body ?? {}) as {
      correo?: string;
      password?: string;
      estado?: string;
      role?: string;
      clinicaId?: number | null;
    };

    const correoClean = normalizeEmail(correo ?? "");
    const passwordClean = String(password ?? "");
    const estadoClean = collapseSpaces(estado ?? "activo").toLowerCase();
    const roleClean = collapseSpaces(role ?? "");
    const parsedClinicaId =
      clinicaId === null || clinicaId === undefined
        ? null
        : Number(clinicaId);

    if (!correoClean) {
      return res.status(400).json({ message: "correo requerido" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
      return res.status(400).json({ message: "correo inválido" });
    }

    if (!passwordClean || passwordClean.length < 8 || passwordClean.length > 72) {
      return res
        .status(400)
        .json({ message: "password debe tener entre 8 y 72 caracteres" });
    }

    if (!isValidRole(roleClean)) {
      return res.status(400).json({ message: "rol inválido" });
    }

    if (!isValidState(estadoClean)) {
      return res.status(400).json({ message: "estado inválido" });
    }

    if (roleClean === "super_admin") {
      if (parsedClinicaId !== null) {
        return res
          .status(400)
          .json({ message: "super_admin no debe tener clínica asignada" });
      }
    } else {
      if (parsedClinicaId === null || !Number.isFinite(parsedClinicaId)) {
        return res
          .status(400)
          .json({ message: "clinicaId requerido para este rol" });
      }
    }

    const existingUser = await prisma.usuario.findUnique({
      where: { correo: correoClean },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    }

    const foundRole = await prisma.role.findUnique({
      where: { rol: roleClean },
    });

    if (!foundRole) {
      return res.status(400).json({ message: "Rol no encontrado" });
    }

    if (parsedClinicaId !== null) {
      const clinica = await prisma.clinica.findUnique({
        where: { id: parsedClinicaId },
      });

      if (!clinica) {
        return res.status(400).json({ message: "Clínica no encontrada" });
      }
    }

    const passwordHash = await bcrypt.hash(passwordClean, 10);

    const created = await prisma.usuario.create({
      data: {
        correo: correoClean,
        password_hash: passwordHash,
        estado: estadoClean,
        id_rol: foundRole.id,
        id_clinica: roleClean === "super_admin" ? null : parsedClinicaId,
      },
      include: {
        rol: true,
        clinica: true,
      },
    });

    return res.status(201).json(sanitizeUserResponse(created));
  } catch (error) {
    console.error("POST /usuarios error:", error);
    return res.status(500).json({ message: "No se pudo crear el usuario" });
  }
});

usuariosRouter.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "id inválido" });
    }

    const {
      correo,
      password,
      estado,
      role,
      clinicaId,
    } = (req.body ?? {}) as {
      correo?: string;
      password?: string;
      estado?: string;
      role?: string;
      clinicaId?: number | null;
    };

    const existing = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true, clinica: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const correoClean = correo ? normalizeEmail(correo) : existing.correo;
    const estadoClean = estado
      ? collapseSpaces(estado).toLowerCase()
      : existing.estado;
    const roleClean = role ? collapseSpaces(role) : existing.rol.rol;

    const parsedClinicaId =
      clinicaId === undefined
        ? existing.id_clinica
        : clinicaId === null
        ? null
        : Number(clinicaId);

    if (!correoClean) {
      return res.status(400).json({ message: "correo requerido" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
      return res.status(400).json({ message: "correo inválido" });
    }

    if (!isValidRole(roleClean)) {
      return res.status(400).json({ message: "rol inválido" });
    }

    if (!isValidState(estadoClean)) {
      return res.status(400).json({ message: "estado inválido" });
    }

    if (roleClean === "super_admin") {
      if (parsedClinicaId !== null) {
        return res
          .status(400)
          .json({ message: "super_admin no debe tener clínica asignada" });
      }
    } else {
      if (parsedClinicaId === null || !Number.isFinite(parsedClinicaId)) {
        return res
          .status(400)
          .json({ message: "clinicaId requerido para este rol" });
      }
    }

    const duplicateEmail = await prisma.usuario.findFirst({
      where: {
        correo: correoClean,
        NOT: { id },
      },
    });

    if (duplicateEmail) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    }

    const foundRole = await prisma.role.findUnique({
      where: { rol: roleClean },
    });

    if (!foundRole) {
      return res.status(400).json({ message: "Rol no encontrado" });
    }

    if (parsedClinicaId !== null) {
      const clinica = await prisma.clinica.findUnique({
        where: { id: parsedClinicaId },
      });

      if (!clinica) {
        return res.status(400).json({ message: "Clínica no encontrada" });
      }
    }

    const data: Prisma.UsuarioUpdateInput = {
      correo: correoClean,
      estado: estadoClean,
      rol: { connect: { id: foundRole.id } },
      clinica:
        roleClean === "super_admin"
          ? { disconnect: true }
          : { connect: { id: parsedClinicaId as number } },
    };

    if (password && password.trim().length > 0) {
      if (password.trim().length < 8 || password.trim().length > 72) {
        return res
          .status(400)
          .json({ message: "password debe tener entre 8 y 72 caracteres" });
      }

      data.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data,
      include: {
        rol: true,
        clinica: true,
      },
    });

    return res.json(sanitizeUserResponse(updated));
  } catch (error) {
    console.error("PUT /usuarios/:id error:", error);
    return res.status(500).json({ message: "No se pudo actualizar el usuario" });
  }
});

usuariosRouter.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "id inválido" });
    }

    const { estado } = (req.body ?? {}) as { estado?: string };
    const estadoClean = collapseSpaces(estado ?? "").toLowerCase();

    if (!isValidState(estadoClean)) {
      return res.status(400).json({ message: "estado inválido" });
    }

    const existing = await prisma.usuario.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { estado: estadoClean },
      include: {
        rol: true,
        clinica: true,
      },
    });

    return res.json(sanitizeUserResponse(updated));
  } catch (error) {
    console.error("PATCH /usuarios/:id/status error:", error);
    return res.status(500).json({ message: "No se pudo actualizar el estado" });
  }
});