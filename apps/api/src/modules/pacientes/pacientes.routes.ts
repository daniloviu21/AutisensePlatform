import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { allowRoles, requireAuth } from "../../middlewares/auth";
import { buildPacienteScope, getSafeClinicScope } from "../../utils/policies";
import logger from "../../utils/logger";
import { logAudit } from "../../utils/audit";

export const pacientesRouter = Router();

// ─── Todos los endpoints requieren autenticación ──────────────────────────────
pacientesRouter.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLINICAL_READ_ROLES = ["super_admin", "clinic_admin", "profesional", "tutor"] as const;
const CLINICAL_WRITE_ROLES = ["super_admin", "clinic_admin", "profesional"] as const;

function collapseSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

function sanitizePaciente(p: any) {
  return {
    id: p.id,
    id_clinica: p.id_clinica,
    clinicaNombre: p.clinica?.nombre ?? null,
    nombre: p.nombre,
    ap_paterno: p.ap_paterno,
    ap_materno: p.ap_materno ?? null,
    fecha_nacimiento: p.fecha_nacimiento,
    sexo: p.sexo,
    escolaridad: p.escolaridad ?? null,
    diagnostico_presuntivo: p.diagnostico_presuntivo ?? null,
    antecedentes_relevantes: p.antecedentes_relevantes ?? null,
    notas_generales: p.notas_generales ?? null,
    estado: p.estado,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ─── GET /pacientes ───────────────────────────────────────────────────────────

pacientesRouter.get(
  "/",
  allowRoles(...CLINICAL_READ_ROLES),
  async (req, res) => {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));

    const q = String(req.query.q ?? "").trim();
    const estado = String(req.query.estado ?? "").trim();
    const sexo = String(req.query.sexo ?? "").trim();
    const clinicaIdParam = String(req.query.clinicaId ?? "").trim();

    // Scope por rol
    const baseScope = buildPacienteScope(user);
    const andFilters: any[] = [baseScope];

    // Filtro adicional solicitado (solo útil si es super_admin)
    if (req.user!.role === "super_admin" && clinicaIdParam) {
      const cid = Number(clinicaIdParam);
      if (Number.isFinite(cid)) andFilters.push({ id_clinica: cid });
    }

    if (estado && ["activo", "inactivo"].includes(estado)) {
      andFilters.push({ estado });
    }

    if (sexo && ["M", "F", "Otro"].includes(sexo)) {
      andFilters.push({ sexo });
    }

    if (q) {
      andFilters.push({
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { ap_paterno: { contains: q, mode: "insensitive" } },
          { ap_materno: { contains: q, mode: "insensitive" } },
          { diagnostico_presuntivo: { contains: q, mode: "insensitive" } },
        ]
      });
    }

    const where = { AND: andFilters };

    try {
      const [total, items] = await Promise.all([
        prisma.paciente.count({ where }),
        prisma.paciente.findMany({
          where,
          include: { clinica: { select: { nombre: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return res.json({ page, pageSize, total, items: items.map(sanitizePaciente) });
    } catch (e) {
      logger.error("GET /pacientes error", { err: String(e) });
      return res.status(500).json({ message: "No se pudieron obtener los pacientes" });
    }
  }
);

// ─── GET /pacientes/:id ───────────────────────────────────────────────────────

pacientesRouter.get(
  "/:id",
  allowRoles(...CLINICAL_READ_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

    try {
      const scope = buildPacienteScope(req.user!);
      const p = await prisma.paciente.findFirst({
        where: { id, ...scope },
        include: {
          clinica: { select: { nombre: true } },
          tutores: {
            include: {
              usuario: {
                select: { id: true, correo: true, estado: true },
              },
            },
            orderBy: [{ es_principal: "desc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!p) return res.status(404).json({ message: "Paciente no encontrado o fuera de tu alcance" });

      return res.json({
        ...sanitizePaciente(p),
        tutores: p.tutores.map((t) => ({
          id: t.id,
          id_usuario: t.id_usuario,
          correo: t.usuario.correo,
          estadoUsuario: t.usuario.estado,
          parentesco: t.parentesco,
          es_principal: t.es_principal,
          createdAt: t.createdAt,
        })),
      });
    } catch (e) {
      console.error("GET /pacientes/:id error:", e);
      return res.status(500).json({ message: "Error al obtener el paciente" });
    }
  }
);

// ─── POST /pacientes ──────────────────────────────────────────────────────────

pacientesRouter.post(
  "/",
  allowRoles(...CLINICAL_WRITE_ROLES),
  async (req, res) => {
    const user = req.user!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const nombre = collapseSpaces(String(body.nombre ?? ""));
    const ap_paterno = collapseSpaces(String(body.ap_paterno ?? ""));
    const ap_materno = body.ap_materno ? collapseSpaces(String(body.ap_materno)) : null;
    const rawFecha = String(body.fecha_nacimiento ?? "");
    const sexo = String(body.sexo ?? "").trim();
    const escolaridad = body.escolaridad ? String(body.escolaridad).trim() : null;
    const diagnostico = body.diagnostico_presuntivo ? String(body.diagnostico_presuntivo).trim() : null;
    const antecedentes = body.antecedentes_relevantes ? String(body.antecedentes_relevantes).trim() : null;
    const notas = body.notas_generales ? String(body.notas_generales).trim() : null;

    // Determinar clínica
    const safeClinicId = getSafeClinicScope(user, body.clinicaId as number | null);

    if (safeClinicId === null) {
      return res.status(400).json({ message: "clinicaId requerido" });
    }

    if (!nombre) return res.status(400).json({ message: "nombre requerido" });
    if (!ap_paterno) return res.status(400).json({ message: "ap_paterno requerido" });
    if (!rawFecha || isNaN(new Date(rawFecha).getTime())) {
      return res.status(400).json({ message: "fecha_nacimiento inválida (ISO date)" });
    }
    if (!["M", "F", "Otro"].includes(sexo)) {
      return res.status(400).json({ message: "sexo debe ser M, F u Otro" });
    }
    if (!safeClinicId || !Number.isFinite(safeClinicId)) {
      return res.status(400).json({ message: "clinicaId inválido" });
    }

    try {
      const clinica = await prisma.clinica.findUnique({ where: { id: safeClinicId } });
      if (!clinica) return res.status(400).json({ message: "Clínica no encontrada" });

      const created = await prisma.paciente.create({
        data: {
          id_clinica: safeClinicId,
          nombre,
          ap_paterno,
          ap_materno,
          fecha_nacimiento: new Date(rawFecha),
          sexo,
          escolaridad,
          diagnostico_presuntivo: diagnostico,
          antecedentes_relevantes: antecedentes,
          notas_generales: notas,
        },
        include: { clinica: { select: { nombre: true } } },
      });

      logAudit(prisma, { userId: Number(user.sub), userRole: user.role, action: "PACIENTE_CREATED", entity: "Paciente", entityId: created.id, detail: `${nombre} ${ap_paterno}`, ip: req.ip, statusCode: 201 });
      return res.status(201).json(sanitizePaciente(created));
    } catch (e) {
      logger.error("POST /pacientes error", { err: String(e) });
      return res.status(500).json({ message: "No se pudo crear el paciente" });
    }
  }
);

// ─── PUT /pacientes/:id ───────────────────────────────────────────────────────

pacientesRouter.put(
  "/:id",
  allowRoles(...CLINICAL_WRITE_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

    const body = (req.body ?? {}) as Record<string, unknown>;

    try {
      const scope = buildPacienteScope(user);
      const existing = await prisma.paciente.findFirst({ where: { id, ...scope } });
      if (!existing) return res.status(404).json({ message: "Paciente no encontrado o fuera de tu alcance" });

      const data: Prisma.PacienteUpdateInput = {};

      if (body.nombre != null) data.nombre = collapseSpaces(String(body.nombre));
      if (body.ap_paterno != null) data.ap_paterno = collapseSpaces(String(body.ap_paterno));
      if ("ap_materno" in body) data.ap_materno = body.ap_materno ? collapseSpaces(String(body.ap_materno)) : null;
      if (body.fecha_nacimiento != null) {
        const d = new Date(String(body.fecha_nacimiento));
        if (isNaN(d.getTime())) return res.status(400).json({ message: "fecha_nacimiento inválida" });
        data.fecha_nacimiento = d;
      }
      if (body.sexo != null) {
        const s = String(body.sexo).trim();
        if (!["M", "F", "Otro"].includes(s)) return res.status(400).json({ message: "sexo inválido" });
        data.sexo = s;
      }
      if ("escolaridad" in body) data.escolaridad = body.escolaridad ? String(body.escolaridad).trim() : null;
      if ("diagnostico_presuntivo" in body) data.diagnostico_presuntivo = body.diagnostico_presuntivo ? String(body.diagnostico_presuntivo).trim() : null;
      if ("antecedentes_relevantes" in body) data.antecedentes_relevantes = body.antecedentes_relevantes ? String(body.antecedentes_relevantes).trim() : null;
      if ("notas_generales" in body) data.notas_generales = body.notas_generales ? String(body.notas_generales).trim() : null;

      const updated = await prisma.paciente.update({
        where: { id },
        data,
        include: { clinica: { select: { nombre: true } } },
      });

      logAudit(prisma, { userId: Number(user.sub), userRole: user.role, action: "PACIENTE_UPDATED", entity: "Paciente", entityId: id, ip: req.ip, statusCode: 200 });
      return res.json(sanitizePaciente(updated));
    } catch (e) {
      logger.error("PUT /pacientes/:id error", { err: String(e) });
      return res.status(500).json({ message: "No se pudo actualizar el paciente" });
    }
  }
);

// ─── PATCH /pacientes/:id/status ─────────────────────────────────────────────

pacientesRouter.patch(
  "/:id/status",
  allowRoles(...CLINICAL_WRITE_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

    const { estado } = (req.body ?? {}) as { estado?: string };
    if (!estado || !["activo", "inactivo"].includes(estado)) {
      return res.status(400).json({ message: "estado debe ser 'activo' o 'inactivo'" });
    }

    try {
      const scope = buildPacienteScope(user);
      const existing = await prisma.paciente.findFirst({ where: { id, ...scope } });
      if (!existing) return res.status(404).json({ message: "Paciente no encontrado o fuera de tu alcance" });

      const updated = await prisma.paciente.update({
        where: { id },
        data: { estado },
        include: { clinica: { select: { nombre: true } } },
      });

      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PACIENTE_STATUS_CHANGED", entity: "Paciente", entityId: id, detail: `estado:${estado}`, ip: req.ip, statusCode: 200 });
      return res.json(sanitizePaciente(updated));
    } catch (e) {
      logger.error("PATCH /pacientes/:id/status error", { err: String(e) });
      return res.status(500).json({ message: "No se pudo actualizar el estado" });
    }
  }
);

// ─── GET /pacientes/:id/tutores ───────────────────────────────────────────────

pacientesRouter.get(
  "/:id/tutores",
  allowRoles(...CLINICAL_READ_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

    try {
      const scope = buildPacienteScope(user);
      const p = await prisma.paciente.findFirst({ where: { id, ...scope } });
      if (!p) return res.status(404).json({ message: "Paciente no encontrado o fuera de alcance" });

      const tutores = await prisma.tutorPaciente.findMany({
        where: { id_paciente: id },
        include: { usuario: { select: { id: true, correo: true, estado: true } } },
        orderBy: [{ es_principal: "desc" }, { createdAt: "asc" }],
      });

      return res.json(tutores.map((t) => ({
        id: t.id,
        id_usuario: t.id_usuario,
        correo: t.usuario.correo,
        estadoUsuario: t.usuario.estado,
        parentesco: t.parentesco,
        es_principal: t.es_principal,
        createdAt: t.createdAt,
      })));
    } catch (e) {
      console.error("GET /pacientes/:id/tutores error:", e);
      return res.status(500).json({ message: "Error al obtener tutores" });
    }
  }
);

// ─── POST /pacientes/:id/tutores ──────────────────────────────────────────────

pacientesRouter.post(
  "/:id/tutores",
  allowRoles(...CLINICAL_WRITE_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

    const { userId, parentesco, esPrincipal } = (req.body ?? {}) as {
      userId?: unknown;
      parentesco?: unknown;
      esPrincipal?: unknown;
    };

    if (!userId || !Number.isFinite(Number(userId))) {
      return res.status(400).json({ message: "userId requerido" });
    }
    if (!parentesco || typeof parentesco !== "string" || !parentesco.trim()) {
      return res.status(400).json({ message: "parentesco requerido" });
    }

    const tutorUserId = Number(userId);

    try {
      const scope = buildPacienteScope(user);
      const [paciente, tutor] = await Promise.all([
        prisma.paciente.findFirst({ where: { id, ...scope } }),
        prisma.usuario.findFirst({
          where: { id: tutorUserId, rol: { rol: "tutor" } },
          include: { rol: true },
        }),
      ]);

      if (!paciente) return res.status(404).json({ message: "Paciente no encontrado o fuera de alcance" });
      if (!tutor) return res.status(400).json({ message: "Usuario no encontrado o no tiene rol tutor" });

      const safeClinicId = getSafeClinicScope(user, null);
      if (safeClinicId !== null && paciente.id_clinica !== safeClinicId) {
        return res.status(403).json({ message: "Sin permiso" });
      }

      // Si se establece como principal, quitar la bandera del anterior
      if (esPrincipal === true) {
        await prisma.tutorPaciente.updateMany({
          where: { id_paciente: id, es_principal: true },
          data: { es_principal: false },
        });
      }

      const link = await prisma.tutorPaciente.create({
        data: {
          id_paciente: id,
          id_usuario: tutorUserId,
          parentesco: parentesco.trim(),
          es_principal: esPrincipal === true,
        },
        include: { usuario: { select: { id: true, correo: true, estado: true } } },
      });

      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PACIENTE_TUTOR_LINKED", entity: "Paciente", entityId: id, detail: `tutorId:${tutorUserId}`, ip: req.ip, statusCode: 201 });
      return res.status(201).json({
        id: link.id,
        id_usuario: link.id_usuario,
        correo: link.usuario.correo,
        estadoUsuario: link.usuario.estado,
        parentesco: link.parentesco,
        es_principal: link.es_principal,
        createdAt: link.createdAt,
      });
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ message: "Este tutor ya está vinculado al paciente" });
      }
      console.error("POST /pacientes/:id/tutores error:", e);
      return res.status(500).json({ message: "No se pudo vincular el tutor" });
    }
  }
);

// ─── DELETE /pacientes/:id/tutores/:tutorId ───────────────────────────────────

pacientesRouter.delete(
  "/:id/tutores/:tutorId",
  allowRoles(...CLINICAL_WRITE_ROLES),
  async (req, res) => {
    const user = req.user!;
    const id = Number(req.params.id);
    const tutorId = Number(req.params.tutorId);

    if (!Number.isFinite(id) || !Number.isFinite(tutorId)) {
      return res.status(400).json({ message: "ids inválidos" });
    }

    try {
      const scope = buildPacienteScope(user);
      const paciente = await prisma.paciente.findFirst({ where: { id, ...scope } });
      if (!paciente) return res.status(404).json({ message: "Paciente no encontrado o fuera de tu alcance" });

      await prisma.tutorPaciente.delete({ where: { id: tutorId } });
      
      logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PACIENTE_TUTOR_UNLINKED", entity: "Paciente", entityId: id, detail: `tutorLink:${tutorId}`, ip: req.ip, statusCode: 200 });
      return res.json({ ok: true });
    } catch (e: any) {
      if (e?.code === "P2025") return res.status(404).json({ message: "Vínculo no encontrado" });
      console.error("DELETE /pacientes/:id/tutores/:tutorId error:", e);
      return res.status(500).json({ message: "No se pudo eliminar el vínculo" });
    }
  }
);
