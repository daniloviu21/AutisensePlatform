import { PrismaClient } from "@prisma/client";
import logger from "./logger";

export interface AuditData {
  userId?: number | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entity?: string | null;
  entityId?: number | null;
  detail?: string | null;
  ip?: string | null;
  statusCode?: number | null;
}

/**
 * Fire-and-forget audit log insertion.
 * Never throws — errors are logged but don't block the response.
 */
export function logAudit(prisma: PrismaClient, data: AuditData): void {
  const { statusCode, ...prismaData } = data;

  if (statusCode !== undefined && statusCode !== null) {
    prismaData.detail = prismaData.detail
      ? `${prismaData.detail} [status: ${statusCode}]`
      : `status: ${statusCode}`;
  }

  prisma.auditLog
    .create({ data: prismaData })
    .catch((err) => logger.error("logAudit DB error", { err: String(err) }));
}
