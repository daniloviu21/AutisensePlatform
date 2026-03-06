import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export type AuthUser = {
  sub: string;
  role: string;
  clinicId: number | null;
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
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido/expirado" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "No auth" });
    if (!roles.includes(role)) return res.status(403).json({ message: "Sin permiso" });
    return next();
  };
}