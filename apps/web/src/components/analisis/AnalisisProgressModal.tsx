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
  Chip,
} from "@mui/material";
import {
  CheckCircle,
  ScienceOutlined,
  ErrorOutline,
  CloudUploadOutlined,
  PsychologyOutlined,
  AssessmentOutlined,
} from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onRunAnalysis: () => Promise<{ ok: boolean; analisisId?: number }>;
};

type StageKey = "upload" | "mediapipe" | "model" | "saving" | "done";

const STAGES: { key: StageKey; label: string; sublabel: string; icon: React.ReactNode }[] = [
  {
    key: "upload",
    label: "Subiendo video...",
    sublabel: "Transfiriendo el archivo al servidor de análisis",
    icon: <CloudUploadOutlined sx={{ fontSize: 64 }} />,
  },
  {
    key: "mediapipe",
    label: "Extrayendo características...",
    sublabel: "MediaPipe analiza puntos de referencia faciales y corporales",
    icon: <PsychologyOutlined sx={{ fontSize: 64 }} />,
  },
  {
    key: "model",
    label: "Ejecutando modelo SVM...",
    sublabel: "El modelo de machine learning genera la predicción",
    icon: <ScienceOutlined sx={{ fontSize: 64 }} />,
  },
  {
    key: "saving",
    label: "Guardando resultados...",
    sublabel: "Almacenando métricas y predicciones en el expediente",
    icon: <AssessmentOutlined sx={{ fontSize: 64 }} />,
  },
];

// Simulate visual progress while the real request is pending.
// Real stages are unknown — we simulate progress up to 90% and
// jump to 100% when the API resolves.
const STAGE_DURATIONS_MS = [3000, 35000, 15000, 4000];

export default function AnalisisProgressModal({ open, onClose, onRunAnalysis }: Props) {
  const theme = useTheme();
  const navigate = useNavigate();

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isError, setIsError] = useState(false);
  const [analisisId, setAnalisisId] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startTimeRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearInterval(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!open) {
      setCurrentStageIdx(0);
      setProgress(0);
      setIsFinished(false);
      setIsError(false);
      setAnalisisId(null);
      setElapsedMs(0);
      clearAllTimers();
      return;
    }

    startTimeRef.current = Date.now();
    let cancelled = false;

    // ── Elapsed timer ─────────────────────────────────────────
    const elapsedTimer = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
    timersRef.current.push(elapsedTimer);

    // ── Simulated visual progress across stages ───────────────
    // We advance through stages visually while the real request runs.
    // Max progress we allow before API responds = 88%.
    const MAX_SIMULATED_PROGRESS = 88;
    let accumulated = 0;

    STAGE_DURATIONS_MS.forEach((duration, idx) => {
      const stageStart = STAGE_DURATIONS_MS.slice(0, idx).reduce((a, b) => a + b, 0);
      const stageTarget = ((idx + 1) / STAGES.length) * MAX_SIMULATED_PROGRESS;

      const timer = window.setTimeout(() => {
        if (cancelled) return;
        setCurrentStageIdx(idx);

        // Smooth interpolation within the stage
        const stepMs = 100;
        const steps = duration / stepMs;
        let step = 0;
        const inner = window.setInterval(() => {
          if (cancelled) {
            clearInterval(inner);
            return;
          }
          step++;
          const localPct = step / steps;
          const newProgress = accumulated + (stageTarget - accumulated) * localPct;
          setProgress(Math.min(newProgress, MAX_SIMULATED_PROGRESS));
          if (step >= steps) {
            accumulated = stageTarget;
            clearInterval(inner);
          }
        }, stepMs);
        timersRef.current.push(inner);
      }, stageStart);

      timersRef.current.push(timer);
    });

    // ── Fire the real API call ────────────────────────────────
    onRunAnalysis().then(({ ok, analisisId: newId }) => {
      if (cancelled) return;
      clearAllTimers();

      if (ok) {
        setProgress(100);
        setCurrentStageIdx(STAGES.length - 1);
        setTimeout(() => {
          if (!cancelled) {
            setAnalisisId(newId ?? null);
            setIsFinished(true);
          }
        }, 600);
      } else {
        setIsError(true);
      }
    });

    return () => {
      cancelled = true;
      clearAllTimers();
    };
  }, [open]); // intentionally omit onRunAnalysis — stable via useCallback

  const currentStage = STAGES[Math.min(currentStageIdx, STAGES.length - 1)];

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      disableEscapeKeyDown={!isFinished && !isError}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
        <Typography variant="h5" fontWeight={800} color="text.primary">
          {isFinished
            ? "✅ Análisis Completado"
            : isError
            ? "Error en el análisis"
            : "Analizando video..."}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 5 }}>
        <Stack spacing={4} alignItems="center" mt={2}>
          {!isFinished && !isError ? (
            <>
              {/* Icono animado */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: "50%",
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  animation: "pulse 2s infinite ease-in-out",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(42,157,143, 0.7)" },
                    "70%": { transform: "scale(1)", boxShadow: "0 0 0 15px rgba(42,157,143, 0)" },
                    "100%": { transform: "scale(0.95)", boxShadow: "0 0 0 0 rgba(42,157,143, 0)" },
                  },
                }}
              >
                {currentStage.icon}
              </Box>

              {/* Etapa actual */}
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {currentStage.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentStage.sublabel}
                </Typography>
              </Box>

              {/* Barra de progreso */}
              <Box sx={{ width: "100%" }}>
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight={600} color="text.secondary">
                    Progreso
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={formatElapsed(elapsedMs)}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: 12 }}
                    />
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {Math.round(progress)}%
                    </Typography>
                  </Stack>
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

              {/* Etapas visuales */}
              <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                {STAGES.map((s, i) => (
                  <Chip
                    key={s.key}
                    label={s.label.replace("...", "")}
                    size="small"
                    color={
                      i < currentStageIdx
                        ? "success"
                        : i === currentStageIdx
                        ? "primary"
                        : "default"
                    }
                    variant={i === currentStageIdx ? "filled" : "outlined"}
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Stack>

              <Typography variant="caption" color="text.disabled" textAlign="center">
                El análisis puede tardar entre 30 segundos y 2 minutos según la duración del video.
                No cierres esta ventana.
              </Typography>
            </>
          ) : isError ? (
            <>
              <ErrorOutline sx={{ fontSize: 80, color: "error.main", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
                Ocurrió un error al procesar el video. Verifica que el video sea válido y que el
                servicio de análisis esté disponible.
              </Typography>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                onClick={onClose}
                color="error"
                sx={{ borderRadius: 2, mt: 3 }}
              >
                Cerrar e intentar de nuevo
              </Button>
            </>
          ) : (
            <>
              <CheckCircle sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth={400}>
                El análisis de video ha concluido. Los resultados ya están disponibles en el
                expediente del paciente.
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Tiempo total: {formatElapsed(elapsedMs)}
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
                  Ver resultados
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
