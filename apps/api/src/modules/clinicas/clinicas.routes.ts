import { Router } from "express";
import { prisma } from "../../db/prisma";
import { Prisma } from "@prisma/client";
import { allowRoles, requireAuth } from "../../middlewares/auth";

export const clinicasRouter = Router();

clinicasRouter.use(requireAuth, allowRoles("super_admin"));

const allowedSortFields = new Set([
  "nombre",
  "razon_social",
  "rfc",
  "telefono",
  "correo_contacto",
  "estado",
  "createdAt",
]);

clinicasRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));
  const q = String(req.query.q ?? "").trim();
  const estado = String(req.query.estado ?? "").trim().toLowerCase();
  const sortField = String(req.query.sortField ?? "createdAt").trim();
  const sortDirection =
    String(req.query.sortDirection ?? "desc").trim().toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const where: Prisma.ClinicaWhereInput = {
    ...(q.length > 0
      ? {
          OR: [
            { nombre: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { razon_social: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { rfc: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { correo_contacto: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { telefono: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
    ...(estado === "activa" || estado === "suspendida" ? { estado } : {}),
  };

  const orderByField = allowedSortFields.has(sortField) ? sortField : "createdAt";

  const [total, items] = await Promise.all([
    prisma.clinica.count({ where }),
    prisma.clinica.findMany({
      where,
      orderBy: {
        [orderByField]: sortDirection,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return res.json({ page, pageSize, total, items });
});

clinicasRouter.post("/", async (req, res) => {
  const {
    nombre,
    razon_social,
    rfc,
    telefono,
    correo_contacto,
    direccion,
    estado,
  } = req.body ?? {};

  if (!nombre) {
    return res.status(400).json({ message: "nombre requerido" });
  }

  const created = await prisma.clinica.create({
    data: {
      nombre,
      razon_social: razon_social ?? null,
      rfc: rfc ?? null,
      telefono: telefono ?? null,
      correo_contacto: correo_contacto ?? null,
      direccion: direccion ?? null,
      estado: estado ?? "activa",
    },
  });

  return res.status(201).json(created);
});

clinicasRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "id inválido" });
  }

  const updated = await prisma.clinica.update({
    where: { id },
    data: { ...req.body },
  });

  return res.json(updated);
});

clinicasRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ message: "id inválido" });
  }

  const updated = await prisma.clinica.update({
    where: { id },
    data: { estado: "suspendida" },
  });

  return res.json(updated);
});