import { Router } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../../middlewares/auth";
import { allowRoles } from "../../middlewares/auth";
import logger from "../../utils/logger";

export const auditLogsRouter = Router();

// GET /audit-logs — super_admin only, paginated + filtered
auditLogsRouter.get(
  "/",
  requireAuth,
  allowRoles("super_admin"),
  async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const action = req.query.action ? String(req.query.action) : undefined;
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;

      const where: Record<string, unknown> = {};
      if (action) where.action = action;
      if (userId && !Number.isNaN(userId)) where.userId = userId;
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return res.json({ data, total, page, pageSize });
    } catch (e) {
      logger.error("GET /audit-logs error", { err: String(e) });
      return res.status(500).json({ message: "Error al obtener los logs" });
    }
  }
);
