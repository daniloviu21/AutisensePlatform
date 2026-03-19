import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export type AuthUser = {
  sub: string;
  role: string;
  clinicId: number | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "No token" });

  const token = auth.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido/expirado" });
  }
}

export function requireMfa(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mfaEnabled && !req.user?.mfaVerified) {
    return res.status(403).json({ message: "MFA verificado requerido para esta acción." });
  }
  return next();
}

export function allowRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "No auth" });
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Permisos insuficientes" });
    }
    return next();
  };
}