import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { JSX } from "react";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: Array<"super_admin" | "clinic_admin" | "profesional" | "tutor">;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}