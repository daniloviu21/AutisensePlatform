import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const simularAnalisis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pacienteId, tipoEncuentro, fecha, motivo, contexto, videoFile } = req.body;

    // The user running this is the `profesional`
    // req.user has been populated by requireAuth
    const userIdSub = req.user?.sub;
    if (!userIdSub) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    const userId = Number(userIdSub);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { profesional: true, rol: true }
    });

    if (!usuario) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }

    const esClinicAdmin = usuario.rol.rol === "clinic_admin";
    const esProfesional = usuario.rol.rol === "profesional";

    if (!esClinicAdmin && !esProfesional) {
      res.status(403).json({ message: "No tienes permiso para realizar esta acción." });
      return;
    }

    const idClinica = esClinicAdmin ? usuario.id_clinica : usuario.profesional?.id_clinica;
    if (!idClinica) {
      res.status(403).json({ message: "Usuario no asociado a ninguna clínica." });
      return;
    }

    // Determine profesional ID for Encuentro
    let idProfesionalParaEncuentro: number;
    if (esProfesional && usuario.profesional) {
      idProfesionalParaEncuentro = usuario.profesional.id;
    } else {
      const unProf = await prisma.profesional.findFirst({ where: { id_clinica: idClinica } });
      if (!unProf) {
        res.status(400).json({ message: "No existen profesionales en esta clínica para crear el análisis." });
        return;
      }
      idProfesionalParaEncuentro = unProf.id;
    }

    // Validate the patient belongs to the professional's clinic
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: Number(pacienteId),
        id_clinica: idClinica,
      }
    });

    if (!paciente) {
      res.status(404).json({ message: "Paciente no encontrado o no pertenece a tu clínica." });
      return;
    }

    // Parse the date safely
    const fechaDate = fecha ? new Date(fecha) : new Date();

    // Start transaction to save all 3 fake entities
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear Encuentro
      const encuentro = await tx.encuentro.create({
        data: {
          id_paciente: paciente.id,
          id_profesional: idProfesionalParaEncuentro,
          tipo_encuentro: tipoEncuentro,
          fecha: fechaDate,
          motivo: motivo,
          resumen: contexto,
          estado: "completado",
        }
      });

      // 2. Crear Archivo Mock
      const archivo = await tx.archivo.create({
        data: {
          id_paciente: paciente.id,
          id_encuentro: encuentro.id,
          nombre_archivo: videoFile?.name || "video_simulado.mp4",
          tipo_mime: videoFile?.type || "video/mp4",
          tamano_bytes: videoFile?.size || 15000000, // 15MB fallback
          url_placeholder: "mock://autisense/analisis/video.mp4",
          descripcion: "Archivo procesado temporalmente en fase simulada",
          subido_por_id: userId,
        }
      });

      // 3. Crear AnalisisIA Mock
      // Let's generate a coherent mock score
      // Score ranges from 0 to 1, let's say 0.65 for example
      const mockScore = 0.65 + (Math.random() * 0.2); // 0.65 to 0.85
      const clasificacion = mockScore > 0.75 ? "Riesgo Alto" : "Riesgo Moderado";

      const analisis = await tx.analisisIA.create({
        data: {
          id_archivo: archivo.id,
          estado: "completado",
          score: mockScore,
          clasificacion: clasificacion,
          confianza: 0.92,
          modelo: "mock",
          modelo_version: "sim-v1",
        }
      });

      return { encuentro, archivo, analisis };
    });

    res.status(201).json({
      message: "Análisis simulado guardado correctamente",
      analisisId: resultado.analisis.id,
      data: resultado
    });

  } catch (error) {
    console.error("Error en simularAnalisis:", error);
    res.status(500).json({ message: "Error interno simulando análisis" });
  }
};

export const getHistorialAnalisis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pacienteId } = req.query;

    const userIdSub = req.user?.sub;
    if (!userIdSub) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    const userId = Number(userIdSub);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { profesional: true, rol: true }
    });

    if (!usuario) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }

    const esClinicAdmin = usuario.rol.rol === "clinic_admin";
    const esProfesional = usuario.rol.rol === "profesional";

    if (!esClinicAdmin && !esProfesional) {
      res.status(403).json({ message: "No tienes permiso para realizar esta acción." });
      return;
    }

    const idClinica = esClinicAdmin ? usuario.id_clinica : usuario.profesional?.id_clinica;
    if (!idClinica) {
      res.status(403).json({ message: "Usuario no asociado a ninguna clínica." });
      return;
    }

    // Build query filters
    const whereClause: any = {
      // Must belong to the clinic
      archivo: {
        paciente: {
          id_clinica: idClinica
        }
      }
    };

    if (pacienteId) {
      whereClause.archivo.paciente.id = Number(pacienteId);
    }

    const historial = await prisma.analisisIA.findMany({
      where: whereClause,
      include: {
        archivo: {
          include: {
            paciente: {
              select: { id: true, nombre: true, ap_paterno: true }
            },
            encuentro: {
              select: { fecha: true, tipo_encuentro: true, motivo: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(historial);

  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ message: "Error interno obteniendo resultados" });
  }
};

export const getAnalisisById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const userIdSub = req.user?.sub;
    if (!userIdSub) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    const userId = Number(userIdSub);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { profesional: true, rol: true }
    });

    if (!usuario) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }

    const esClinicAdmin = usuario.rol.rol === "clinic_admin";
    const esProfesional = usuario.rol.rol === "profesional";

    if (!esClinicAdmin && !esProfesional) {
      res.status(403).json({ message: "No tienes permiso para realizar esta acción." });
      return;
    }

    const idClinica = esClinicAdmin ? usuario.id_clinica : usuario.profesional?.id_clinica;
    if (!idClinica) {
      res.status(403).json({ message: "Usuario no asociado a ninguna clínica." });
      return;
    }

    const analisis = await prisma.analisisIA.findUnique({
      where: { id: Number(id) },
      include: {
        archivo: {
          include: {
            paciente: true,
            encuentro: {
              include: {
                profesional: {
                  select: { nombre: true, ap_paterno: true, ap_materno: true, especialidad: true }
                }
              }
            }
          }
        }
      }
    });

    if (!analisis) {
      res.status(404).json({ message: "Análisis no encontrado." });
      return;
    }

    // Auth Validation: Check if the patient belongs to the professional's clinic
    if (analisis.archivo.paciente.id_clinica !== idClinica) {
      res.status(403).json({ message: "Acceso no autorizado a este análisis." });
      return;
    }

    res.json(analisis);

  } catch (error) {
    console.error("Error al obtener análisis:", error);
    res.status(500).json({ message: "Error interno obteniendo el análisis" });
  }
};

export const guardarObservaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;

    const userIdSub = req.user?.sub;
    if (!userIdSub) {
      res.status(401).json({ message: "No autenticado" });
      return;
    }
    const userId = Number(userIdSub);

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { profesional: true, rol: true }
    });

    if (!usuario) {
      res.status(401).json({ message: "Usuario no encontrado" });
      return;
    }

    const esClinicAdmin = usuario.rol.rol === "clinic_admin";
    const esProfesional = usuario.rol.rol === "profesional";

    if (!esClinicAdmin && !esProfesional) {
      res.status(403).json({ message: "No tienes permiso para realizar esta acción." });
      return;
    }

    const idClinica = esClinicAdmin ? usuario.id_clinica : usuario.profesional?.id_clinica;
    if (!idClinica) {
      res.status(403).json({ message: "Usuario no asociado a ninguna clínica." });
      return;
    }

    const analisis = await prisma.analisisIA.findUnique({
      where: { id: Number(id) },
      include: {
        archivo: {
          include: {
            paciente: true
          }
        }
      }
    });

    if (!analisis) {
      res.status(404).json({ message: "Análisis no encontrado." });
      return;
    }

    if (analisis.archivo.paciente.id_clinica !== idClinica) {
      res.status(403).json({ message: "Acceso no autorizado a este análisis." });
      return;
    }

    const actualizado = await prisma.analisisIA.update({
      where: { id: Number(id) },
      data: { observaciones }
    });

    res.json({ message: "Observaciones guardadas correctamente", data: actualizado });

  } catch (error) {
    console.error("Error al guardar observaciones:", error);
    res.status(500).json({ message: "Error interno al guardar observaciones" });
  }
};
