import { Router } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import streamifier from "streamifier";
import { prisma } from "../../db/prisma";
import { allowRoles, requireAuth } from "../../middlewares/auth";
import { upload } from "../../middlewares/upload";
import { cloudinary } from "../../utils/cloudinary";
import { buildProfesionalScope, getSafeClinicScope } from "../../utils/policies";
import logger from "../../utils/logger";
import { logAudit } from "../../utils/audit";

export const profesionalesRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function cleanComparable(value: string) {
  return collapseSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}



function sanitizeProfesionalResponse(item: any) {
  return {
    id: item.id,
    nombre: item.nombre,
    ap_paterno: item.ap_paterno,
    ap_materno: item.ap_materno ?? "",
    telefono: item.telefono ?? "",
    especialidad: item.especialidad,
    organizacion: item.organizacion ?? "",
    foto_url: item.foto_url ?? "",
    foto_public_id: item.foto_public_id ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    usuario: item.usuario
      ? {
          id: item.usuario.id,
          correo: item.usuario.correo,
          estado: item.usuario.estado,
          must_change_password: item.usuario.must_change_password,
        }
      : null,
    clinica: item.clinica
      ? {
          id: item.clinica.id,
          nombre: item.clinica.nombre,
          estado: item.clinica.estado,
        }
      : null,
    id_usuario: item.id_usuario,
    id_clinica: item.id_clinica,
  };
}

async function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  folder: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("No se pudo subir la imagen"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

async function destroyCloudinaryImage(publicId?: string | null) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Cloudinary destroy error:", error);
  }
}

function validatePayload(data: {
  correo: string;
  password?: string;
  estado: string;
  clinicaId: number | null;
  nombre: string;
  ap_paterno: string;
  ap_materno: string;
  telefono: string;
  especialidad: string;
  organizacion: string;
  foto_url: string;
  foto_public_id: string;
  mode: "create" | "edit";
}) {
  if (!data.correo) return "correo requerido";
  if (!EMAIL_REGEX.test(data.correo)) return "correo inválido";

  if (data.mode === "create") {
    if (!data.password) return "password requerido";
    if (data.password.length < 8 || data.password.length > 72) {
      return "password debe tener entre 8 y 72 caracteres";
    }
  }

  if (!["activo", "suspendido", "pendiente"].includes(data.estado)) {
    return "estado inválido";
  }

  if (!data.clinicaId || !Number.isFinite(data.clinicaId)) {
    return "clinicaId requerido";
  }

  if (!data.nombre) return "nombre requerido";
  if (data.nombre.length < 2 || data.nombre.length > 80) {
    return "nombre fuera de rango permitido";
  }

  if (!data.ap_paterno) return "ap_paterno requerido";
  if (data.ap_paterno.length < 2 || data.ap_paterno.length > 80) {
    return "ap_paterno fuera de rango permitido";
  }

  if (data.ap_materno && data.ap_materno.length > 80) {
    return "ap_materno fuera de rango permitido";
  }

  const phoneDigits = data.telefono.replace(/[^\d]/g, "");
  if (!data.telefono) return "telefono requerido";
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return "telefono inválido";
  }

  if (!data.especialidad) return "especialidad requerida";
  if (data.especialidad.length < 3 || data.especialidad.length > 80) {
    return "especialidad fuera de rango permitido";
  }

  if (!data.organizacion) return "organizacion requerida";
  if (data.organizacion.length < 2 || data.organizacion.length > 100) {
    return "organizacion fuera de rango permitido";
  }

  if (data.foto_url && !URL_REGEX.test(data.foto_url)) {
    return "foto_url inválida";
  }

  if (data.foto_public_id && data.foto_public_id.length > 180) {
    return "foto_public_id fuera de rango permitido";
  }

  return "";
}

profesionalesRouter.get("/", requireAuth, allowRoles("super_admin", "clinic_admin", "profesional"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));

    const q = String(req.query.q ?? "").trim();
    const estado = String(req.query.estado ?? "").trim().toLowerCase();
    const clinicaIdRaw = String(req.query.clinicaId ?? "").trim();

    // 🛡 Base Scope por rol
    const baseScope = buildProfesionalScope(req.user!);
    const andFilters: Prisma.ProfesionalWhereInput[] = [baseScope];

    // Filtro adicional solicitado (solo útil si es super_admin, ya que los otros ya están scopeados)
    if (req.user?.role === "super_admin" && clinicaIdRaw) {
      const parsedClinicId = Number(clinicaIdRaw);
      if (!Number.isFinite(parsedClinicId)) return res.status(400).json({ message: "clinicaId inválido" });
      andFilters.push({ id_clinica: parsedClinicId });
    }

    if (q.length > 0) {
      andFilters.push({
        OR: [
          { nombre: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { ap_paterno: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { ap_materno: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { especialidad: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { organizacion: { contains: q, mode: Prisma.QueryMode.insensitive } },
          {
            usuario: {
              is: {
                correo: { contains: q, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
          {
            clinica: {
              is: {
                nombre: { contains: q, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
        ],
      });
    }

    if (estado === "activo" || estado === "suspendido" || estado === "pendiente") {
      andFilters.push({
        usuario: {
          is: {
            estado,
          },
        },
      });
    }

    const where: Prisma.ProfesionalWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};

    const [total, items] = await Promise.all([
      prisma.profesional.count({ where }),
      prisma.profesional.findMany({
        where,
        include: {
          usuario: true,
          clinica: true,
        },
        orderBy: [{ createdAt: "desc" }, { nombre: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      page,
      pageSize,
      total,
      items: items.map(sanitizeProfesionalResponse),
    });
  } catch (error) {
    logger.error("GET /profesionales error", { err: String(error) });
    return res.status(500).json({ message: "No se pudieron obtener los profesionales" });
  }
});

profesionalesRouter.post("/", requireAuth, allowRoles("super_admin", "clinic_admin"), upload.single("foto"), async (req, res) => {
  try {
    console.log("POST /profesionales BODY:", req.body);
    console.log(
      "POST /profesionales FILE:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : null
    );

    const raw = req.body ?? {};

    let uploadedPhoto: { secure_url: string; public_id: string } | null = null;

    if (req.file) {
      uploadedPhoto = await uploadBufferToCloudinary(
        req.file.buffer,
        "autisense/profesionales"
      );
    }

    const payload = {
      correo: normalizeEmail(String(raw.correo ?? "")),
      password: String(raw.password ?? ""),
      estado: collapseSpaces(String(raw.estado ?? "activo")).toLowerCase(),
      clinicaId: getSafeClinicScope(req.user!, raw.clinicaId),
      nombre: collapseSpaces(String(raw.nombre ?? "")),
      ap_paterno: collapseSpaces(String(raw.ap_paterno ?? "")),
      ap_materno: collapseSpaces(String(raw.ap_materno ?? "")),
      telefono: normalizePhone(String(raw.telefono ?? "")),
      especialidad: collapseSpaces(String(raw.especialidad ?? "")),
      organizacion: collapseSpaces(String(raw.organizacion ?? "")),
      foto_url: uploadedPhoto?.secure_url ?? String(raw.foto_url ?? "").trim(),
      foto_public_id:
        uploadedPhoto?.public_id ?? collapseSpaces(String(raw.foto_public_id ?? "")),
      mode: "create" as const,
    };

    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const clinica = await prisma.clinica.findUnique({
      where: { id: payload.clinicaId! },
    });

    if (!clinica) {
      return res.status(400).json({ message: "Clínica no encontrada" });
    }

    if (clinica.estado !== "activa") {
      return res.status(400).json({ message: "La clínica no está activa" });
    }

    const profesionalRole = await prisma.role.findUnique({
      where: { rol: "profesional" },
    });

    if (!profesionalRole) {
      return res.status(400).json({ message: "Rol profesional no encontrado" });
    }

    const existingEmail = await prisma.usuario.findUnique({
      where: { correo: payload.correo },
    });

    if (existingEmail) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    }

    const fullNameComparable = cleanComparable(
      `${payload.nombre} ${payload.ap_paterno} ${payload.ap_materno}`
    );

    const existingSameName = await prisma.profesional.findMany({
      where: { id_clinica: payload.clinicaId! },
    });

    const duplicatedName = existingSameName.find((item) => {
      const currentComparable = cleanComparable(
        `${item.nombre} ${item.ap_paterno} ${item.ap_materno ?? ""}`
      );
      return currentComparable === fullNameComparable;
    });

    if (duplicatedName) {
      return res.status(409).json({
        message: "Ya existe un profesional con el mismo nombre completo en esta clínica",
      });
    }

    const duplicatedPhone = await prisma.profesional.findFirst({
      where: {
        telefono: payload.telefono,
      },
    });

    if (duplicatedPhone) {
      return res.status(409).json({
        message: "Ya existe un profesional con ese teléfono",
      });
    }

    const passwordHash = await bcrypt.hash(payload.password!, 10);

    const created = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          correo: payload.correo,
          password_hash: passwordHash,
          estado: payload.estado,
          must_change_password: true,
          mfaEnabled: true,
          id_rol: profesionalRole.id,
          id_clinica: payload.clinicaId!,
        },
      });

      const profesional = await tx.profesional.create({
        data: {
          id_usuario: usuario.id,
          id_clinica: payload.clinicaId!,
          nombre: payload.nombre,
          ap_paterno: payload.ap_paterno,
          ap_materno: payload.ap_materno || null,
          telefono: payload.telefono || null,
          especialidad: payload.especialidad,
          organizacion: payload.organizacion || null,
          foto_url: payload.foto_url || null,
          foto_public_id: payload.foto_public_id || null,
        },
        include: {
          usuario: true,
          clinica: true,
        },
      });

      return profesional;
    });

    logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PROFESIONAL_CREATED", entity: "Profesional", entityId: created.id, detail: `${created.nombre} ${created.ap_paterno} - ${created.especialidad}`, ip: req.ip, statusCode: 201 });
    return res.status(201).json(sanitizeProfesionalResponse(created));
  } catch (error) {
    logger.error("POST /profesionales error", { err: String(error) });
    return res.status(500).json({ message: "No se pudo crear el profesional" });
  }
});

profesionalesRouter.put("/:id", requireAuth, allowRoles("super_admin", "clinic_admin", "profesional"), upload.single("foto"), async (req, res) => {
  try {
    console.log("PUT /profesionales/:id BODY:", req.body);
    console.log(
      "PUT /profesionales/:id FILE:",
      req.file
        ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : null
    );

    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "id inválido" });
    }

    const existing = await prisma.profesional.findUnique({
      where: { id },
      include: {
        usuario: true,
        clinica: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Profesional no encontrado" });
    }

    // 🛡 Ownership rules
    if (req.user?.role === "profesional" && existing.id_usuario !== Number(req.user.sub)) {
      return res.status(403).json({ message: "Solo puedes editar tu propio perfil." });
    }
    if (req.user?.role === "clinic_admin" && existing.id_clinica !== req.user?.clinicId) {
      return res.status(403).json({ message: "El profesional no pertenece a tu clínica." });
    }

    let uploadedPhoto: { secure_url: string; public_id: string } | null = null;

    if (req.file) {
      uploadedPhoto = await uploadBufferToCloudinary(
        req.file.buffer,
        "autisense/profesionales"
      );
    }

    const raw = req.body ?? {};

    const payload = {
      correo: normalizeEmail(String(raw.correo ?? existing.usuario?.correo ?? "")),
      estado: collapseSpaces(
        String(raw.estado ?? existing.usuario?.estado ?? "activo")
      ).toLowerCase(),
      clinicaId: getSafeClinicScope(req.user!, raw.clinicaId) ?? existing.id_clinica,
      nombre: collapseSpaces(String(raw.nombre ?? existing.nombre)),
      ap_paterno: collapseSpaces(String(raw.ap_paterno ?? existing.ap_paterno)),
      ap_materno: collapseSpaces(String(raw.ap_materno ?? existing.ap_materno ?? "")),
      telefono: normalizePhone(String(raw.telefono ?? existing.telefono ?? "")),
      especialidad: collapseSpaces(String(raw.especialidad ?? existing.especialidad)),
      organizacion: collapseSpaces(String(raw.organizacion ?? existing.organizacion ?? "")),
      foto_url: uploadedPhoto?.secure_url ?? String(raw.foto_url ?? existing.foto_url ?? "").trim(),
      foto_public_id:
        uploadedPhoto?.public_id ??
        collapseSpaces(String(raw.foto_public_id ?? existing.foto_public_id ?? "")),
      mode: "edit" as const,
    };

    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const duplicatedEmail = await prisma.usuario.findFirst({
      where: {
        correo: payload.correo,
        id: { not: existing.id_usuario },
      },
    });

    if (duplicatedEmail) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    }

    const fullNameComparable = cleanComparable(
      `${payload.nombre} ${payload.ap_paterno} ${payload.ap_materno}`
    );

    const sameClinicProfessionals = await prisma.profesional.findMany({
      where: {
        id_clinica: payload.clinicaId!,
        id: { not: id },
      },
    });

    const duplicatedName = sameClinicProfessionals.find((item) => {
      const currentComparable = cleanComparable(
        `${item.nombre} ${item.ap_paterno} ${item.ap_materno ?? ""}`
      );
      return currentComparable === fullNameComparable;
    });

    if (duplicatedName) {
      return res.status(409).json({
        message: "Ya existe un profesional con el mismo nombre completo en esta clínica",
      });
    }

    const duplicatedPhone = await prisma.profesional.findFirst({
      where: {
        telefono: payload.telefono,
        id: { not: id },
      },
    });

    if (duplicatedPhone) {
      return res.status(409).json({
        message: "Ya existe un profesional con ese teléfono",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: existing.id_usuario },
        data: {
          correo: payload.correo,
          estado: payload.estado,
          id_clinica: payload.clinicaId!,
        },
      });

      const profesional = await tx.profesional.update({
        where: { id },
        data: {
          id_clinica: payload.clinicaId!,
          nombre: payload.nombre,
          ap_paterno: payload.ap_paterno,
          ap_materno: payload.ap_materno || null,
          telefono: payload.telefono || null,
          especialidad: payload.especialidad,
          organizacion: payload.organizacion || null,
          foto_url: payload.foto_url || null,
          foto_public_id: payload.foto_public_id || null,
        },
        include: {
          usuario: true,
          clinica: true,
        },
      });

      return profesional;
    });

    if (uploadedPhoto && existing.foto_public_id && existing.foto_public_id !== uploadedPhoto.public_id) {
      await destroyCloudinaryImage(existing.foto_public_id);
    }

    logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PROFESIONAL_UPDATED", entity: "Profesional", entityId: id, ip: req.ip, statusCode: 200 });
    return res.json(sanitizeProfesionalResponse(updated));
  } catch (error) {
    logger.error("PUT /profesionales/:id error", { err: String(error) });
    return res.status(500).json({ message: "No se pudo actualizar el profesional" });
  }
});

profesionalesRouter.patch("/:id/status", requireAuth, allowRoles("super_admin", "clinic_admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const estado = String(req.body?.estado ?? "").trim().toLowerCase();

    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "id inválido" });
    }

    if (!["activo", "suspendido", "pendiente"].includes(estado)) {
      return res.status(400).json({ message: "estado inválido" });
    }

    const profesional = await prisma.profesional.findUnique({
      where: { id },
      include: {
        usuario: true,
      },
    });

    if (!profesional) {
      return res.status(404).json({ message: "Profesional no encontrado" });
    }

    if (req.user?.role === "clinic_admin" && profesional.id_clinica !== req.user?.clinicId) {
      return res.status(403).json({ message: "Sin permiso" });
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: profesional.id_usuario },
      data: { estado },
    });

    logAudit(prisma, { userId: Number(req.user?.sub), userRole: req.user?.role, action: "PROFESIONAL_STATUS_CHANGED", entity: "Profesional", entityId: id, detail: `estado:${estado}`, ip: req.ip, statusCode: 200 });
    return res.json({
      id: profesional.id,
      estado: updatedUser.estado,
      id_usuario: profesional.id_usuario,
    });
  } catch (error) {
    logger.error("PATCH /profesionales/:id/status error", { err: String(error) });
    return res.status(500).json({ message: "No se pudo actualizar el estado" });
  }
});