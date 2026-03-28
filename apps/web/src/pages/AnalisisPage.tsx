import { useState } from "react";
import { Box, Button, Stack, Alert } from "@mui/material";
import { PlayArrowOutlined } from "@mui/icons-material";
import AdminLayout from "../layout/AdminLayout";
import AnalisisEncuentroForm, { type EncuentroData } from "../components/analisis/AnalisisEncuentroForm";
import AnalisisVideoDropzone from "../components/analisis/AnalisisVideoDropzone";
import AnalisisSimulatorModal from "../components/analisis/AnalisisSimulatorModal";
import { http } from "../api/http";

export default function AnalisisPage() {
  const [encuentroData, setEncuentroData] = useState<EncuentroData>({
    pacienteId: "",
    tipoEncuentro: "consulta",
    fecha: new Date().toISOString().split("T")[0],
    motivo: "",
    contexto: "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartAnalysis = () => {
    setErrorMsg(null);

    // Validation
    if (!encuentroData.pacienteId) {
      setErrorMsg("Debe seleccionar un paciente para iniciar el análisis.");
      return;
    }

    if (!videoFile) {
      setErrorMsg("Debe seleccionar o arrastrar un archivo de video.");
      return;
    }

    // Launch Simulator Modal
    setSimulatorOpen(true);
  };

  const handleSimulationComplete = async (): Promise<{ ok: boolean; analisisId?: number }> => {
    try {
      const response = await http.post("/analisis/simular", {
        pacienteId: encuentroData.pacienteId,
        tipoEncuentro: encuentroData.tipoEncuentro,
        fecha: encuentroData.fecha,
        motivo: encuentroData.motivo,
        contexto: encuentroData.contexto,
        videoFile: {
          name: videoFile?.name,
          type: videoFile?.type,
          size: videoFile?.size,
        },
      });

      return { ok: true, analisisId: response.data.analisisId };
    } catch (error) {
      console.error(error);
      return { ok: false };
    }
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

      {/* Simulated Flow UI */}
      <AnalisisSimulatorModal
        open={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSimulationComplete={handleSimulationComplete}
      />
    </AdminLayout>
  );
}
