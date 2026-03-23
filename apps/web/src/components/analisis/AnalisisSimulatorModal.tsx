import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  LinearProgress,
  Stack,
  Button,
  alpha,
  useTheme,
} from "@mui/material";
import { CheckCircle, ScienceOutlined, ErrorOutline } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onSimulationComplete: () => Promise<{ ok: boolean; analisisId?: number }>;
};

const SIMULATION_STAGES = [
  { label: "Preparando análisis...", duration: 2000 },
  { label: "Subiendo video temporal (simulado)...", duration: 3000 },
  { label: "Ejecutando modelo IA AutiSense...", duration: 4000 },
  { label: "Generando reporte de resultados...", duration: 2000 },
  { label: "Finalizado", duration: 500 },
];

export default function AnalisisSimulatorModal({ open, onClose, onSimulationComplete }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isError, setIsError] = useState(false);
  const [analisisId, setAnalisisId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setCurrentStage(0);
      setProgress(0);
      setIsFinished(false);
      setIsError(false);
      setAnalisisId(null);
      return;
    }

    let progressInterval: number;
    let stageTimeout: number;

    const runSimulation = async () => {
      let currentProgress = 0;

      for (let i = 0; i < SIMULATION_STAGES.length; i++) {
        if (isError) break;
        setCurrentStage(i);
        const stage = SIMULATION_STAGES[i];
        const stepTime = stage.duration / 100;

        let targetProgress = ((i + 1) / SIMULATION_STAGES.length) * 100;
        if (i === SIMULATION_STAGES.length - 1) targetProgress = 100;

        await new Promise<void>((resolve) => {
          progressInterval = window.setInterval(() => {
            currentProgress += (targetProgress - currentProgress) * 0.1;
            setProgress(Math.min(currentProgress, 100));
          }, stepTime);

          stageTimeout = window.setTimeout(() => {
            clearInterval(progressInterval);
            setProgress(targetProgress);
            resolve();
          }, stage.duration);
        });
      }

      // API call to persist mock analysis
      const { ok, analisisId: newId } = await onSimulationComplete();
      
      if (ok) {
        setAnalisisId(newId ?? null);
        setIsFinished(true);
      } else {
        setIsError(true);
      }
    };

    runSimulation();

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout);
    };
  }, [open, onSimulationComplete]);

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary">
          {isFinished ? "Análisis Finalizado" : "Procesando video..."}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 5 }}>
        <Stack spacing={4} alignItems="center" mt={2}>
          {!isFinished && !isError ? (
            <>
              <Box
                sx={{
                  p: 3,
                  borderRadius: "50%",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  animation: "pulse 2s infinite ease-in-out",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(42,157,143, 0.7)" },
                    "70%": { transform: "scale(1)", boxShadow: "0 0 0 15px rgba(42,157,143, 0)" },
                    "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(42,157,143, 0)" },
                  },
                }}
              >
                <ScienceOutlined sx={{ fontSize: 64, color: "primary.main" }} />
              </Box>

              <Box sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    {SIMULATION_STAGES[currentStage]?.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {Math.round(progress)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "action.hover",
                    "& .MuiLinearProgress-bar": { borderRadius: 5 },
                  }}
                />
              </Box>
            </>
          ) : isError ? (
            <>
              <ErrorOutline sx={{ fontSize: 80, color: "error.main", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
                Ocurrió un error al intentar guardar el análisis simulado.
              </Typography>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={onClose}
                color="error"
                sx={{ borderRadius: 2, mt: 3 }}
              >
                Cerrar
              </Button>
            </>
          ) : (
            <>
              <CheckCircle sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
                La simulación de análisis concluyó exitosamente. Se han generado los reportes preliminares.
              </Typography>

              <Stack direction="row" spacing={2} sx={{ width: "100%", mt: 3 }}>
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  onClick={onClose}
                  sx={{ borderRadius: 2 }}
                >
                  Cerrar
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={() => navigate(analisisId ? `/resultados/${analisisId}` : "/resultados")}
                  sx={{ borderRadius: 2 }}
                >
                  Ver resultado
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
