import { useState, useCallback } from "react";
import { Box, Stack, Alert } from "@mui/material";
import AdminLayout from "../layout/AdminLayout";
import AnalisisEncuentroForm, { type EncuentroData } from "../components/analisis/AnalisisEncuentroForm";
import AnalisisVideoDropzone from "../components/analisis/AnalisisVideoDropzone";
import AnalisisProgressModal from "../components/analisis/AnalisisProgressModal";
import { http } from "../api/http";

export default function AnalisisPage() {
  const [encuentroData, setEncuentroData] = useState<EncuentroData>({
    pacienteId: "",
    tipoEncuentro: "consulta",
    fecha: new Date().toISOString().split("T")[0],
    motivo: "",
    contexto: "",
    etnia: "White European",
    ictericia: "no",
    familiar_tea: "no",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartAnalysis = () => {
    setErrorMsg(null);

    if (!encuentroData.pacienteId) {
      setErrorMsg("Debe seleccionar un paciente para iniciar el análisis.");
      return;
    }

    if (!videoFile) {
      setErrorMsg("Debe seleccionar o arrastrar un archivo de video.");
      return;
    }

    setProgressOpen(true);
  };

  // Esta función es la que el modal llama para hacer el trabajo real.
  // Arma el FormData y llama al endpoint real del backend.
  const handleRunAnalysis = useCallback(async (): Promise<{ ok: boolean; analisisId?: number }> => {
    if (!videoFile) return { ok: false };

    try {
      const formData = new FormData();
      formData.append("video", videoFile, videoFile.name);
      formData.append("pacienteId", String(encuentroData.pacienteId));
      formData.append("tipoEncuentro", encuentroData.tipoEncuentro);
      formData.append("fecha", encuentroData.fecha);
      formData.append("motivo", encuentroData.motivo);
      formData.append("contexto", encuentroData.contexto || "");
      formData.append("etnia", encuentroData.etnia);
      formData.append("ictericia", encuentroData.ictericia);
      formData.append("familiar_tea", encuentroData.familiar_tea);

      const response = await http.post("/analisis/nuevo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000, // 3 minutos — MediaPipe puede tardar
      });

      return { ok: true, analisisId: response.data.analisis_id };
    } catch (error: any) {
      console.error("Error en análisis:", error);
      return { ok: false };
    }
  }, [videoFile, encuentroData]);

  const handleModalClose = () => {
    setProgressOpen(false);
  };

  return (
    <AdminLayout
      title="Nuevo análisis"
      subtitle="Completa los datos del encuentro y carga un video para iniciar el análisis del paciente."
    >
      <Box sx={{ maxWidth: 1040, mx: "auto", mt: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>
            {errorMsg}
          </Alert>
        )}

        <Stack spacing={3}>
          <AnalisisEncuentroForm
            value={encuentroData}
            onChange={setEncuentroData}
          />
          
          <AnalisisVideoDropzone
            file={videoFile}
            onFileSelect={setVideoFile}
            onStartAnalysis={handleStartAnalysis}
            isStartDisabled={!encuentroData.pacienteId || !videoFile}
          />
        </Stack>
      </Box>

      {/* Modal de progreso real */}
      <AnalisisProgressModal
        open={progressOpen}
        onClose={handleModalClose}
        onRunAnalysis={handleRunAnalysis}
      />
    </AdminLayout>
  );
}
