import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Alert,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  ArrowBackOutlined,
  SaveOutlined,
  WarningAmberOutlined,
  AccessTimeOutlined,
  InfoOutlined,
} from "@mui/icons-material";
import AdminLayout from "../layout/AdminLayout";
import { http } from "../api/http";

type DetailResource = {
  id: number;
  estado: string;
  score: number | null;
  clasificacion: string | null;
  probabilidad_asd: number | null;
  confianza: string | null;         // "alta" | "media" | "baja"
  umbral_usado: number | null;
  modelo: string | null;
  modelo_version: string | null;
  auc_modelo: number | null;
  log_loss: number | null;
  f1_macro: number | null;
  tiempo_extraccion_ms: number | null;
  tiempo_total_ms: number | null;
  advertencias: string[];
  error_msg: string | null;
  observaciones: string | null;
  createdAt: string;

  archivo: {
    nombre_archivo: string;
    tipo_mime: string;
    tamano_bytes: number;
    paciente: {
      nombre: string;
      ap_paterno: string;
      ap_materno: string | null;
      fecha_nacimiento: string;
      sexo: string;
    };
    encuentro?: {
      fecha: string;
      tipo_encuentro: string;
      motivo: string;
      resumen: string | null;
      profesional?: {
        nombre: string;
        ap_paterno: string;
        especialidad: string;
      };
    } | null;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusChip(status: string) {
  const map: Record<string, "success" | "warning" | "error" | "default"> = {
    completado: "success",
    procesando: "warning",
    error: "error",
    pendiente: "default",
  };
  return <Chip label={status} color={map[status] ?? "default"} size="small" />;
}

function getClasificacionColor(val: string | null): "error" | "success" | "default" {
  if (!val) return "default";
  return val === "ASD" ? "error" : "success";
}

function getConfianzaColor(val: string | null): "success" | "warning" | "error" | "default" {
  if (val === "alta") return "success";
  if (val === "media") return "warning";
  if (val === "baja") return "error";
  return "default";
}

function formatMs(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function MetricCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        textAlign: "center",
      }}
    >
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} mb={0.5}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} arrow>
            <InfoOutlined sx={{ fontSize: 14, color: "text.disabled", cursor: "help" }} />
          </Tooltip>
        )}
      </Stack>
      <Typography variant="h6" fontWeight={800} color="primary.main">
        {value}
      </Typography>
    </Box>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DetailResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [obs, setObs] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    async function fetchDetail() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await http.get(`/analisis/${id}`);
        setData(res.data);
        if (res.data.observaciones) {
          setObs(res.data.observaciones);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setErrorMsg("No se encontró el análisis solicitado.");
        } else if (err.response?.status === 403) {
          setErrorMsg("No tienes acceso a este análisis.");
        } else {
          setErrorMsg("Ocurrió un error al cargar la información.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleSaveObs = async () => {
    try {
      setSavingObs(true);
      setSavedOk(false);
      await http.patch(`/analisis/${id}/observaciones`, { observaciones: obs });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err) {
      alert("No se pudieron guardar las observaciones.");
    } finally {
      setSavingObs(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Detalle del Análisis">
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (errorMsg || !data) {
    return (
      <AdminLayout title="Detalle del Análisis">
        <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
          <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate("/resultados")} sx={{ mb: 3 }}>
            Volver a Resultados
          </Button>
          <Alert severity="error">{errorMsg || "Análisis no encontrado"}</Alert>
        </Box>
      </AdminLayout>
    );
  }

  const paciente = data.archivo.paciente;
  const encuentro = data.archivo.encuentro;
  const nombreCompleto = [paciente.nombre, paciente.ap_paterno, paciente.ap_materno]
    .filter(Boolean)
    .join(" ");
  const fechaEncuentro = encuentro?.fecha
    ? new Date(encuentro.fecha).toLocaleDateString()
    : new Date(data.createdAt).toLocaleDateString();

  // Probabilidad para la barra visual
  const probASD = data.probabilidad_asd ?? data.score ?? null;
  const isASD = data.clasificacion === "ASD";

  return (
    <AdminLayout
      title="Detalle del Análisis"
      subtitle={`Resultados para ${nombreCompleto}`}
    >
      <Box sx={{ maxWidth: 1100, mx: "auto", mt: 2, pb: 8 }}>
        <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate("/resultados")} sx={{ mb: 3 }}>
          Volver a Resultados
        </Button>

        <Grid container spacing={4}>
          {/* ── COLUMNA IZQUIERDA ─────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={3}>
              {/* Datos Clínicos */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    Contexto Clínico
                  </Typography>
                  <Stack spacing={2} sx={{ "& .MuiTypography-root": { fontSize: 14 } }}>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Paciente</Typography>
                      <Typography>{nombreCompleto} ({paciente.sexo})</Typography>
                    </Box>
                    <Grid container>
                      <Grid size={{ xs: 6 }}>
                        <Typography color="text.secondary" fontWeight={600}>Fecha</Typography>
                        <Typography>{fechaEncuentro}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography color="text.secondary" fontWeight={600}>Tipo encuentro</Typography>
                        <Typography sx={{ textTransform: "capitalize" }}>
                          {encuentro?.tipo_encuentro || "N/A"}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Motivo</Typography>
                      <Typography>{encuentro?.motivo || "N/A"}</Typography>
                    </Box>
                    {encuentro?.resumen && (
                      <Box>
                        <Typography color="text.secondary" fontWeight={600}>Contexto</Typography>
                        <Typography>{encuentro.resumen}</Typography>
                      </Box>
                    )}
                    {encuentro?.profesional && (
                      <Box>
                        <Typography color="text.secondary" fontWeight={600}>Profesional</Typography>
                        <Typography>
                          {encuentro.profesional.nombre} {encuentro.profesional.ap_paterno} —{" "}
                          {encuentro.profesional.especialidad}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Archivo */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    Archivo Analizado
                  </Typography>
                  <Stack spacing={1.5} sx={{ "& .MuiTypography-root": { fontSize: 14 } }}>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Nombre</Typography>
                      <Typography sx={{ wordBreak: "break-all" }}>{data.archivo.nombre_archivo}</Typography>
                    </Box>
                    <Grid container>
                      <Grid size={{ xs: 6 }}>
                        <Typography color="text.secondary" fontWeight={600}>Formato</Typography>
                        <Typography>{data.archivo.tipo_mime}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography color="text.secondary" fontWeight={600}>Tamaño</Typography>
                        <Typography>
                          {(data.archivo.tamano_bytes / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>

              {/* Advertencias */}
              {data.advertencias && data.advertencias.length > 0 && (
                <Card
                  elevation={0}
                  sx={{
                    border: "1px solid",
                    borderColor: "warning.main",
                    borderRadius: 2,
                    bgcolor: "warning.50",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <WarningAmberOutlined color="warning" />
                      <Typography variant="h6" fontWeight="bold">
                        Advertencias de calidad
                      </Typography>
                    </Stack>
                    <Stack spacing={0.75}>
                      {data.advertencias.map((adv, i) => (
                        <Typography key={i} variant="body2" color="warning.dark">
                          • {adv}
                        </Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Error si aplica */}
              {data.estado === "error" && data.error_msg && (
                <Alert severity="error">
                  <strong>Error en el procesamiento:</strong> {data.error_msg}
                </Alert>
              )}
            </Stack>
          </Grid>

          {/* ── COLUMNA DERECHA ───────────────────────────────────── */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={3}>
              {/* Resultado principal */}
              <Card
                elevation={0}
                sx={{
                  border: "2px solid",
                  borderColor: "primary.main",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" fontWeight="bold">
                      Predicción del Modelo
                    </Typography>
                    {getStatusChip(data.estado)}
                  </Stack>

                  {/* Clasificación + Confianza */}
                  <Stack direction="row" spacing={2} mb={3} alignItems="center">
                    <Box
                      sx={{
                        flex: 1,
                        p: 2.5,
                        borderRadius: 2,
                        bgcolor: isASD
                          ? "error.50"
                          : data.clasificacion === "TD"
                          ? "success.50"
                          : "action.hover",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        CLASIFICACIÓN
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={900}
                        color={isASD ? "error.main" : data.clasificacion === "TD" ? "success.main" : "text.primary"}
                      >
                        {data.clasificacion ?? "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.clasificacion === "ASD"
                          ? "Indicadores de TEA detectados"
                          : data.clasificacion === "TD"
                          ? "Desarrollo típico"
                          : "Sin clasificar"}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        CONFIANZA
                      </Typography>
                      <Chip
                        label={data.confianza ?? "—"}
                        color={getConfianzaColor(data.confianza)}
                        sx={{ mt: 0.5, fontWeight: 700, fontSize: 14, px: 1 }}
                      />
                    </Box>
                  </Stack>

                  {/* Barra de probabilidad ASD */}
                  {probASD !== null && (
                    <Box mb={3}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          Probabilidad ASD
                        </Typography>
                        <Typography variant="body2" fontWeight={800} color={isASD ? "error.main" : "success.main"}>
                          {(probASD * 100).toFixed(1)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={probASD * 100}
                        color={isASD ? "error" : "success"}
                        sx={{ height: 12, borderRadius: 6, bgcolor: "action.hover" }}
                      />
                      {data.umbral_usado !== null && (
                        <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                          Umbral de decisión: {data.umbral_usado?.toFixed(2)} | Modelo: {data.modelo ?? "SVM"}{" "}
                          {data.modelo_version ?? "v2"}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Métricas del modelo */}
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                    MÉTRICAS DEL MODELO (ENTRENAMIENTO)
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 4 }}>
                      <MetricCard
                        label="AUC-ROC"
                        value={data.auc_modelo !== null ? data.auc_modelo.toFixed(3) : "—"}
                        tooltip="Área bajo la curva ROC — mide la capacidad discriminativa del modelo"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <MetricCard
                        label="F1-Score"
                        value={data.f1_macro !== null ? data.f1_macro.toFixed(3) : "—"}
                        tooltip="F1-Score macro promedio entre clases ASD y TD"
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <MetricCard
                        label="Log-Loss"
                        value={data.log_loss !== null ? data.log_loss.toFixed(3) : "—"}
                        tooltip="Pérdida logarítmica — menor es mejor"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Tiempos de ejecución */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <AccessTimeOutlined color="action" />
                    <Typography variant="h6" fontWeight="bold">
                      Tiempo de ejecución
                    </Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: "center", p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          EXTRACCIÓN (MediaPipe)
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="text.primary" mt={0.5}>
                          {formatMs(data.tiempo_extraccion_ms)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ textAlign: "center", p: 2, borderRadius: 2, bgcolor: "background.default" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                          TOTAL (End-to-end)
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="primary.main" mt={0.5}>
                          {formatMs(data.tiempo_total_ms)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Observaciones */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" mb={1}>
                    Observaciones Clínicas
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Agrega notas interpretativas sobre los resultados arrojados o hallazgos adicionales.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Escribe tus observaciones aquí..."
                    variant="outlined"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<SaveOutlined />}
                      onClick={handleSaveObs}
                      disabled={savingObs}
                      sx={{ borderRadius: 2 }}
                    >
                      {savingObs ? "Guardando..." : "Guardar Observaciones"}
                    </Button>
                    {savedOk && (
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        ¡Guardado exitosamente!
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
}
