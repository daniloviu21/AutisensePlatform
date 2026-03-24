import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import logger from "../../utils/logger";

export const getSuscripcionMiClinica = async (req: Request, res: Response) => {
  try {
    const { clinicId } = (req as any).user;

    if (!clinicId) {
      return res.status(403).json({ message: "No tienes una clínica asociada" });
    }

    const suscripcion = await prisma.suscripcion.findFirst({
      where: { id_clinica: clinicId, estado: "activa" },
      orderBy: { fecha_inicio: "desc" },
      include: {
        pagos: {
          orderBy: { fecha_pago: "desc" },
        },
      },
    });

    if (!suscripcion) {
      // Si no hay activa, buscamos la última aunque esté cancelada
      const ultima = await prisma.suscripcion.findFirst({
        where: { id_clinica: clinicId },
        orderBy: { fecha_inicio: "desc" },
        include: {
          pagos: {
            orderBy: { fecha_pago: "desc" },
          },
        },
      });
      return res.json(ultima || { message: "No se encontró suscripción para esta clínica" });
    }

    return res.json(suscripcion);
  } catch (error) {
    logger.error("Error al obtener suscripción de la clínica", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getHistorialPagos = async (req: Request, res: Response) => {
  try {
    const { clinicId } = (req as any).user;

    if (!clinicId) {
      return res.status(403).json({ message: "No tienes una clínica asociada" });
    }

    const pagos = await prisma.pago.findMany({
      where: {
        suscripcion: {
          id_clinica: clinicId,
        },
      },
      orderBy: { fecha_pago: "desc" },
    });

    return res.json(pagos);
  } catch (error) {
    logger.error("Error al obtener historial de pagos", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getSuscripcionesAdmin = async (req: Request, res: Response) => {
  try {
    const { q, estado, plan, page = 1, pageSize = 10 } = req.query;

    const where: any = {};

    if (q) {
      where.clinica = {
        nombre: {
          contains: String(q),
          mode: "insensitive",
        },
      };
    }

    if (estado && estado !== "todos") {
      where.estado = String(estado);
    }

    if (plan && plan !== "todos") {
      where.plan_nombre = String(plan);
    }

    const [total, items] = await prisma.$transaction([
      prisma.suscripcion.count({ where }),
      prisma.suscripcion.findMany({
        where,
        include: {
          clinica: {
            select: {
              id: true,
              nombre: true,
            },
          },
          pagos: {
            orderBy: { fecha_pago: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
    ]);

    return res.json({
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      items,
    });
  } catch (error) {
    logger.error("Error al obtener suscripciones (admin)", { err: String(error) });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getSuscripcionByIdAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { id: Number(id) },
      include: {
        clinica: true,
        pagos: {
          orderBy: { fecha_pago: "desc" },
        },
      },
    });

    if (!suscripcion) {
      return res.status(404).json({ message: "Suscripción no encontrada" });
    }

    return res.json(suscripcion);
  } catch (error) {
    logger.error("Error al obtener suscripción por ID (admin)", { err: String(error), id: req.params.id });
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

