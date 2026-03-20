import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { requireAuth, requireMfa } from "../../middlewares/auth";

export const meRouter = Router();

// Todos los endpoints de /me requieren autenticación basica
meRouter.use(requireAuth);

function collapseSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

/**
 * PATCH /me/password
 * Permite a cualquier usuario autenticado (con MFA verificado) cambiar su propia contraseña.
 */
meRouter.patch("/password", requireMfa, async (req, res) => {
  const userId = Number(req.user!.sub);

  const { currentPassword, newPassword, confirmPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      message: "currentPassword, newPassword y confirmPassword son requeridos",
    });
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({ message: "La nueva contraseña debe tener entre 8 y 72 caracteres" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Las contraseñas no coinciden" });
  }

  try {
    const user = await prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ message: "La contraseña actual no es correcta" });

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
    if (sameAsCurrent) return res.status(400).json({ message: "La nueva contraseña debe ser diferente a la actual" });

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.usuario.update({
      where: { id: userId },
      data: { password_hash: newHash, must_change_password: false },
    });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("PATCH /me/password error:", error);
    return res.status(500).json({ message: "No se pudo actualizar la contraseña" });
  }
});

/**
 * PATCH /me/mfa
 * Permite a cualquier usuario autenticado activar o desactivar su MFA.
 */
meRouter.patch("/mfa", requireMfa, async (req, res) => {
  const userId = Number(req.user!.sub);
  const { mfaEnabled } = req.body as { mfaEnabled?: boolean };

  if (typeof mfaEnabled !== "boolean") {
    return res.status(400).json({ message: "mfaEnabled debe ser un booleano" });
  }

  try {
    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { mfaEnabled },
      select: {
        id: true,
        correo: true,
        mfaEnabled: true,
        rol: { select: { rol: true } }
      }
    });

    return res.json({ 
      message: mfaEnabled ? "MFA activado correctamente" : "MFA desactivado correctamente",
      user: {
        ...updated,
        role: updated.rol.rol
      }
    });
  } catch (error) {
    console.error("PATCH /me/mfa error:", error);
    return res.status(500).json({ message: "No se pudo actualizar la configuración MFA" });
  }
});

/**
 * GET /me/profile
 * Devuelve los datos de perfil editables del usuario autenticado.
 */
meRouter.get("/profile", async (req, res) => {
  const userId = Number(req.user!.sub);
  const role = req.user!.role;

  try {
    if (role === "profesional") {
      const prof = await prisma.profesional.findFirst({
        where: { id_usuario: userId },
        select: {
          nombre: true,
          ap_paterno: true,
          ap_materno: true,
          telefono: true,
          especialidad: true,
          organizacion: true,
          foto_url: true,
        },
      });
      if (!prof) return res.status(404).json({ message: "Perfil profesional no encontrado" });
      return res.json({ role: "profesional", ...prof });
    }

    if (role === "tutor") {
      const tutor = await prisma.tutor.findFirst({
        where: { id_usuario: userId },
        select: {
          nombre: true,
          ap_paterno: true,
          ap_materno: true,
          telefono: true,
        },
      });
      if (!tutor) return res.status(404).json({ message: "Perfil de tutor no encontrado" });
      return res.json({ role: "tutor", ...tutor });
    }

    // super_admin / clinic_admin: no tienen perfil personal adicional
    return res.json({ role, nombre: null, ap_paterno: null, ap_materno: null, telefono: null });
  } catch (error) {
    console.error("GET /me/profile error:", error);
    return res.status(500).json({ message: "Error al obtener el perfil" });
  }
});

/**
 * PATCH /me/profile
 * Permite a usuarios con perfiles (Profesional o Tutor) actualizar sus propios datos personales.
 */
meRouter.patch("/profile", async (req, res) => {
  const userId = Number(req.user!.sub);
  const role = req.user!.role;

  try {
    if (role === "profesional") {
      const { nombre, ap_paterno, ap_materno, telefono, especialidad, organizacion } = req.body as {
        nombre?: string;
        ap_paterno?: string;
        ap_materno?: string;
        telefono?: string;
        especialidad?: string;
        organizacion?: string;
      };

      if (!nombre?.trim() || !ap_paterno?.trim()) {
        return res.status(400).json({ message: "Nombre y apellido paterno son requeridos" });
      }

      const prof = await prisma.profesional.findFirst({ where: { id_usuario: userId } });
      if (!prof) return res.status(404).json({ message: "Perfil profesional no encontrado" });

      const updated = await prisma.profesional.update({
        where: { id: prof.id },
        data: {
          nombre: collapseSpaces(nombre),
          ap_paterno: collapseSpaces(ap_paterno),
          ap_materno: ap_materno ? collapseSpaces(ap_materno) : null,
          telefono: telefono ? collapseSpaces(telefono) : null,
          especialidad: especialidad ? collapseSpaces(especialidad) : prof.especialidad,
          organizacion: organizacion ? collapseSpaces(organizacion) : null,
        },
      });

      return res.json({ message: "Perfil actualizado correctamente", profile: updated });
    }

    if (role === "tutor") {
      const { nombre, ap_paterno, ap_materno, telefono } = req.body as {
        nombre?: string;
        ap_paterno?: string;
        ap_materno?: string;
        telefono?: string;
      };

      if (!nombre?.trim() || !ap_paterno?.trim()) {
        return res.status(400).json({ message: "Nombre y apellido paterno son requeridos" });
      }

      const tutor = await prisma.tutor.findFirst({ where: { id_usuario: userId } });
      if (!tutor) return res.status(404).json({ message: "Perfil tutor no encontrado" });

      const updated = await prisma.tutor.update({
        where: { id: tutor.id },
        data: {
          nombre: collapseSpaces(nombre),
          ap_paterno: collapseSpaces(ap_paterno),
          ap_materno: ap_materno ? collapseSpaces(ap_materno) : null,
          telefono: telefono ? collapseSpaces(telefono) : null,
        },
      });

      return res.json({ message: "Perfil actualizado correctamente", profile: updated });
    }

    return res.status(403).json({ message: "Rol sin perfil actualizable." });
  } catch (error) {
    console.error("PATCH /me/profile error:", error);
    return res.status(500).json({ message: "Error al actualizar el perfil" });
  }
});
