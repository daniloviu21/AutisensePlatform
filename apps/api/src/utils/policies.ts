import { Prisma } from "@prisma/client";
import { AuthUser } from "../middlewares/auth";

/**
 * 1. Scope para Usuarios
 * - super_admin: todo el contenido global.
 * - clinic_admin: solo usuarios de su clínica, limitados a ciertos roles (no puede ver otros admin ni super_admin).
 */
export function buildUsuarioScope(user: AuthUser): Prisma.UsuarioWhereInput {
  if (user.role === "super_admin") return {};

  if (user.role === "clinic_admin") {
    if (!user.clinicId) throw new Error("clinic_admin sin clínica asignada");
    return {
      id_clinica: user.clinicId,
      rol: { rol: { in: ["profesional", "tutor"] } },
    };
  }

  throw new Error("Rol no autorizado para scope de usuarios");
}

/**
 * 2. Scope para Profesionales
 * - super_admin: todo
 * - clinic_admin y profesional: solo listado de su clínica.
 */
export function buildProfesionalScope(user: AuthUser): Prisma.ProfesionalWhereInput {
  if (user.role === "super_admin") return {};

  if (user.role === "clinic_admin" || user.role === "profesional") {
    if (!user.clinicId) throw new Error("Usuario sin clínica asignada");
    return { id_clinica: user.clinicId };
  }

  throw new Error("Rol no autorizado para scope de profesionales");
}

/**
 * 3. Scope para Pacientes
 * - super_admin: todo
 * - clinic_admin: su clínica
 * - profesional: su clínica (o vinculados directamente, por simplicidad asumimos su clínica entera para acceso clínico local)
 * - tutor: solo pacientes donde estén explícitamente listados en TutorPaciente
 */
export function buildPacienteScope(user: AuthUser): Prisma.PacienteWhereInput {
  if (user.role === "super_admin") return {};

  if (user.role === "clinic_admin" || user.role === "profesional") {
    if (!user.clinicId) throw new Error("Usuario sin clínica asignada");
    return { id_clinica: user.clinicId };
  }

  if (user.role === "tutor") {
    return {
      tutores: {
        some: { id_usuario: Number(user.sub) },
      },
    };
  }

  throw new Error("Rol no autorizado para scope de pacientes");
}

/**
 * 4. Scope para Tutores
 * - super_admin: todo
 * - clinic_admin: su clínica
 * - profesional: su clínica. Permite ver tutores de pacientes de su clínica.
 */
export function buildTutorScope(user: AuthUser): Prisma.TutorWhereInput {
  if (user.role === "super_admin") return {};

  if (user.role === "clinic_admin" || user.role === "profesional") {
    if (!user.clinicId) throw new Error("Usuario sin clínica asignada");
    return { id_clinica: user.clinicId };
  }

  throw new Error("Rol no autorizado para scope de tutores");
}

/**
 * Helper para forzar la inserción/actualización de clinicId segura en payloads.
 * Si es super_admin se le respeta el payload, sino se le fuerza su propio clinicId.
 */
export function getSafeClinicScope(user: AuthUser, requestedClinicId?: number | null): number | null {
  if (user.role === "super_admin") {
    const parsed = Number(requestedClinicId);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return user.clinicId;
}
