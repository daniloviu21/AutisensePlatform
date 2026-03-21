import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { allowRoles, requireAuth } from "../../middlewares/auth";
import { buildTutorScope, getSafeClinicScope } from "../../utils/policies";
import logger from "../../utils/logger";
import { logAudit } from "../../utils/audit";

export const tutoresRouter = Router();
tutoresRouter.use(requireAuth);

const TUTOR_READ_ROLES = ["super_admin", "clinic_admin", "profesional"] as const;
const TUTOR_WRITE_ROLES = ["super_admin", "clinic_admin", "profesional"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function collapseSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim();
}



/** Serializa un registro completo Tutor + Usuario para la respuesta API. */
function sanitizeTutor(t: {
  id: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  telefono: string | null;
  id_clinica: number;
  clinica: { id: number; nombre: string; estado: string } | null;
  createdAt: Date;
  updatedAt: Date;
  usuario: {
    id: number;
    correo: string;
    estado: string;
    mfaEnabled: boolean;
    tutorPacientes: { id: number }[];
  };
}) {
  return {
    id: t.id,
    usuarioId: t.usuario.id,
    nombre: t.nombre,
    ap_paterno: t.ap_paterno,
    ap_materno: t.ap_materno ?? null,
    nombreCompleto: [t.nombre, t.ap_paterno, t.ap_materno].filter(Boolean).join(" "),
    telefono: t.telefono ?? null,
    correo: t.usuario.correo,
    estado: t.usuario.estado,
    mfaEnabled: t.usuario.mfaEnabled,
    clinicaId: t.id_clinica,
    clinicaNombre: t.clinica?.nombre ?? null,
    clinica: t.clinica ?? null,
    pacientesVinculados: t.usuario.tutorPacientes.length,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// ─── GET /tutores — listado paginado ──────────────────────────────────────────

tutoresRouter.get(
  "/",
  allowRoles(...TUTOR_READ_ROLES),
  async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));
      const q = String(req.query.q ?? "").trim();
      const estado = String(req.query.estado ?? "").trim();
      const clinicaIdParam = String(req.query.clinicaId ?? "").trim();
      const sortField = String(req.query.sortField ?? "nombre").trim();
      const sortDirection = String(req.query.sortDirection ?? "asc") === "desc" ? "desc" : "asc";

      const VALID_SORT: Record<string, object> = {
        nombre: { nombre: sortDirection },
        ap_paterno: { ap_paterno: sortDirection },
        clinicaNombre: { clinica: { nombre: sortDirection } },
        estado: { usuario: { estado: sortDirection } },
        createdAt: { createdAt: sortDirection },
      };
      const orderBy = VALID_SORT[sortField] ?? { nombre: "asc" };

      // 🛡 Scope de Tutores
      const baseScope = buildTutorScope(req.user!);
      const andFilters: any[] = [baseScope];

      // Filtro adicional de clínica por query (solo si es super_admin, ya scopeado por buildTutorScope)
      if (req.user!.role === "super_admin" && clinicaIdParam) {
        const parsed = Number(clinicaIdParam);
        if (Number.isFinite(parsed)) andFilters.push({ id_clinica: parsed });
      }

      if (estado && ["activo", "suspendido", "pendiente"].includes(estado)) {
        andFilters.push({ usuario: { estado } });
      }

      if (q) {
        andFilters.push({
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { ap_paterno: { contains: q, mode: "insensitive" } },
            { ap_materno: { contains: q, mode: "insensitive" } },
            { telefono: { contains: q, mode: "insensitive" } },
            { usuario: { correo: { contains: q, mode: "insensitive" } } },
          ]
        });
      }

      const where = { AND: andFilters };

      const tutorInclude = {
        clinica: { select: { id: true, nombre: true, estado: true } },
        usuario: {
          select: {
            id: true,
            correo: true,
            estado: true,
            mfaEnabled: true,
            tutorPacientes: { select: { id: true } },
          },
        },
      };

      const [total, items] = await Promise.all([
        prisma.tutor.count({ where }),
        prisma.tutor.findMany({
          where,
          include: tutorInclude,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return res.json({
        page,
        pageSize,
        total,
        items: items.map(sanitizeTutor),
      });
    } catch (error) {
      console.error("GET /tutores error:", error);
      return res.status(500).json({ message: "No se pudieron obtener los tutores." });
    }
  }
);

// ─── GET /tutores/:id — detalle con pacientes ─────────────────────────────────

tutoresRouter.get(
  "/:id",
  allowRoles(...TUTOR_READ_ROLES),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido." });

      const scope = buildTutorScope(req.user!);
      const tutor = await prisma.tutor.findFirst({
        where: { id, ...scope },
        include: {
          clinica: { select: { id: true, nombre: true, estado: true } },
          usuario: {
            include: {
              tutorPacientes: {
                include: {
                  paciente: {
                    select: {
                      id: true,
                      nombre: true,
                      ap_paterno: true,
                      ap_materno: true,
                      fecha_nacimiento: true,
                      sexo: true,
                      estado: true,
                      diagnostico_presuntivo: true,
                      clinica: { select: { nombre: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!tutor) return res.status(404).json({ message: "Tutor no encontrado o fuera de tu alcance." });

      const tp = tutor.usuario.tutorPacientes;

      return res.json({
        id: tutor.id,
        usuarioId: tutor.usuario.id,
        nombre: tutor.nombre,
        ap_paterno: tutor.ap_paterno,
        ap_materno: tutor.ap_materno ?? null,
        nombreCompleto: [tutor.nombre, tutor.ap_paterno, tutor.ap_materno].filter(Boolean).join(" "),
        telefono: tutor.telefono ?? null,
        correo: tutor.usuario.correo,
        estado: tutor.usuario.estado,
        mfaEnabled: tutor.usuario.mfaEnabled,
        clinicaId: tutor.id_clinica,
        clinicaNombre: tutor.clinica?.nombre ?? null,
        clinica: tutor.clinica,
        pacientesVinculados: tp.length,
        pacientes: tp.map((link) => ({
          vinculoId: link.id,
          pacienteId: link.paciente.id,
          nombre: link.paciente.nombre,
          ap_paterno: link.paciente.ap_paterno,
          ap_materno: link.paciente.ap_materno ?? null,
          fecha_nacimiento: link.paciente.fecha_nacimiento,
          sexo: link.paciente.sexo,
          estado: link.paciente.estado,
          diagnostico_presuntivo: link.paciente.diagnostico_presuntivo ?? null,
          clinicaNombre: link.paciente.clinica?.nombre ?? null,
          parentesco: link.parentesco,
          es_principal: link.es_principal,
        })),
        createdAt: tutor.createdAt,
        updatedAt: tutor.updatedAt,
      });
    } catch (error) {
      console.error("GET /tutores/:id error:", error);
      return res.status(500).json({ message: "No se pudo obtener el tutor." });
    }
  }
);

// ─── POST /tutores — crear usuario + perfil Tutor ─────────────────────────────

tutoresRouter.post(
  "/",
  allowRoles(...TUTOR_WRITE_ROLES),
  async (req, res) => {
    try {

      const {
        correo,
        password,
        nombre,
        ap_paterno,
        ap_materno,
        telefono,
        estado,
        clinicaId,
      } = (req.body ?? {}) as {
        correo?: string;
        password?: string;
        nombre?: string;
        ap_paterno?: string;
        ap_materno?: string;
        telefono?: string;
        estado?: string;
        clinicaId?: number | null;
      };

      const correoClean = normalizeEmail(correo ?? "");
      const passwordClean = String(password ?? "");
      const nombreClean = collapseSpaces(nombre ?? "");
      const apPaternoClean = collapseSpaces(ap_paterno ?? "");
      const apMaternoClean = collapseSpaces(ap_materno ?? "") || null;
      const telefonoClean = collapseSpaces(telefono ?? "") || null;
      const estadoClean = collapseSpaces(estado ?? "activo").toLowerCase();

      const parsedClinicaId = getSafeClinicScope(req.user!, clinicaId);

      // Validaciones
      if (!correoClean) return res.status(400).json({ message: "El correo es requerido." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
        return res.status(400).json({ message: "Correo inválido." });
      }
      if (!passwordClean || passwordClean.length < 8 || passwordClean.length > 72) {
        return res.status(400).json({ message: "La contraseña debe tener entre 8 y 72 caracteres." });
      }
      if (!nombreClean || nombreClean.length < 2) {
        return res.status(400).json({ message: "El nombre es requerido (mínimo 2 caracteres)." });
      }
      if (!apPaternoClean || apPaternoClean.length < 2) {
        return res.status(400).json({ message: "El apellido paterno es requerido (mínimo 2 caracteres)." });
      }
      if (!["activo", "suspendido", "pendiente"].includes(estadoClean)) {
        return res.status(400).json({ message: "Estado inválido." });
      }
      if (parsedClinicaId === null || !Number.isFinite(parsedClinicaId)) {
        return res.status(400).json({ message: "La clínica es requerida." });
      }

      const existing = await prisma.usuario.findUnique({ where: { correo: correoClean } });
      if (existing) return res.status(409).json({ message: "Ya existe un usuario con ese correo." });

      const tutorRole = await prisma.role.findUnique({ where: { rol: "tutor" } });
      if (!tutorRole) return res.status(500).json({ message: "Rol 'tutor' no configurado." });

      const passwordHash = await bcrypt.hash(passwordClean, 12);

      // Crear Usuario y Tutor en una transacción
      const tutor = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            correo: correoClean,
            password_hash: passwordHash,
            estado: estadoClean,
            id_rol: tutorRole.id,
            id_clinica: parsedClinicaId,
            must_change_password: true,
          },
        });

        return tx.tutor.create({
          data: {
            id_usuario: usuario.id,
            id_clinica: parsedClinicaId,
            nombre: nombreClean,
            ap_paterno: apPaternoClean,
            ap_materno: apMaternoClean,
            telefono: telefonoClean,
          },
          include: {
            clinica: { select: { id: true, nombre: true, estado: true } },
            usuario: {
              select: {
                id: true, correo: true, estado: true, mfaEnabled: true,
                tutorPacientes: { select: { id: true } },
              },
            },
          },
        });
      });

      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "TUTOR_CREATED", entity: "Tutor", entityId: tutor.id, detail: `${tutor.nombre} ${tutor.ap_paterno}`, ip: req.ip, statusCode: 201 });
      return res.status(201).json(sanitizeTutor(tutor));
    } catch (error) {
      console.error("POST /tutores error:", error);
      return res.status(500).json({ message: "No se pudo crear el tutor." });
    }
  }
);

// ─── PUT /tutores/:id — actualizar perfil + cuenta ───────────────────────────

tutoresRouter.put(
  "/:id",
  allowRoles(...TUTOR_WRITE_ROLES),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido." });

      const scope = buildTutorScope(req.user!);
      const existing = await prisma.tutor.findFirst({
        where: { id, ...scope },
        include: { usuario: true },
      });

      if (!existing) return res.status(404).json({ message: "Tutor no encontrado o fuera de tu alcance." });

      const { correo, nombre, ap_paterno, ap_materno, telefono, estado, clinicaId } = (req.body ?? {}) as {
        correo?: string;
        nombre?: string;
        ap_paterno?: string;
        ap_materno?: string;
        telefono?: string;
        estado?: string;
        clinicaId?: number | null;
      };

      const correoClean = correo ? normalizeEmail(correo) : existing.usuario.correo;
      const nombreClean = nombre !== undefined ? collapseSpaces(nombre) : existing.nombre;
      const apPaternoClean = ap_paterno !== undefined ? collapseSpaces(ap_paterno) : existing.ap_paterno;
      const apMaternoClean = ap_materno !== undefined ? (collapseSpaces(ap_materno) || null) : existing.ap_materno;
      const telefonoClean = telefono !== undefined ? (collapseSpaces(telefono) || null) : existing.telefono;
      const estadoClean = estado ? collapseSpaces(estado).toLowerCase() : existing.usuario.estado;

      const parsedClinicaId = getSafeClinicScope(req.user!, clinicaId) ?? existing.id_clinica;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoClean)) {
        return res.status(400).json({ message: "Correo inválido." });
      }
      if (!nombreClean || nombreClean.length < 2) {
        return res.status(400).json({ message: "El nombre es requerido (mínimo 2 caracteres)." });
      }
      if (!apPaternoClean || apPaternoClean.length < 2) {
        return res.status(400).json({ message: "El apellido paterno es requerido." });
      }
      if (!["activo", "suspendido", "pendiente"].includes(estadoClean)) {
        return res.status(400).json({ message: "Estado inválido." });
      }

      if (correoClean !== existing.usuario.correo) {
        const conflict = await prisma.usuario.findUnique({ where: { correo: correoClean } });
        if (conflict) return res.status(409).json({ message: "Ya existe un usuario con ese correo." });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.usuario.update({
          where: { id: existing.id_usuario },
          data: { correo: correoClean, estado: estadoClean, id_clinica: parsedClinicaId },
        });

        return tx.tutor.update({
          where: { id },
          data: {
            nombre: nombreClean,
            ap_paterno: apPaternoClean,
            ap_materno: apMaternoClean,
            telefono: telefonoClean,
            id_clinica: parsedClinicaId,
          },
          include: {
            clinica: { select: { id: true, nombre: true, estado: true } },
            usuario: {
              select: {
                id: true, correo: true, estado: true, mfaEnabled: true,
                tutorPacientes: { select: { id: true } },
              },
            },
          },
        });
      });

      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "TUTOR_UPDATED", entity: "Tutor", entityId: id, ip: req.ip, statusCode: 200 });
      return res.json(sanitizeTutor(updated));
    } catch (error) {
      console.error("PUT /tutores/:id error:", error);
      return res.status(500).json({ message: "No se pudo actualizar el tutor." });
    }
  }
);

// ─── PATCH /tutores/:id/status ────────────────────────────────────────────────

tutoresRouter.patch(
  "/:id/status",
  allowRoles(...TUTOR_WRITE_ROLES),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido." });

      const scope = buildTutorScope(req.user!);
      const existing = await prisma.tutor.findFirst({
        where: { id, ...scope },
        include: { usuario: true },
      });

      if (!existing) return res.status(404).json({ message: "Tutor no encontrado o fuera de tu alcance." });

      const { estado } = req.body as { estado?: string };
      const estadoClean = collapseSpaces(estado ?? "").toLowerCase();

      if (!["activo", "suspendido", "pendiente"].includes(estadoClean)) {
        return res.status(400).json({ message: "Estado inválido." });
      }

      await prisma.usuario.update({
        where: { id: existing.id_usuario },
        data: { estado: estadoClean },
      });

      const updated = await prisma.tutor.findUnique({
        where: { id },
        include: {
          clinica: { select: { id: true, nombre: true, estado: true } },
          usuario: {
            select: {
              id: true, correo: true, estado: true, mfaEnabled: true,
              tutorPacientes: { select: { id: true } },
            },
          },
        },
      });

      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "TUTOR_STATUS_CHANGED", entity: "Tutor", entityId: id, detail: `estado:${estadoClean}`, ip: req.ip, statusCode: 200 });
      return res.json(sanitizeTutor(updated!));
    } catch (error) {
      console.error("PATCH /tutores/:id/status error:", error);
      return res.status(500).json({ message: "No se pudo actualizar el estado." });
    }
  }
);
