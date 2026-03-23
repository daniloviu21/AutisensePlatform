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
  Stack,
  TextField,
  Typography,
  Alert,
  Divider,
} from "@mui/material";
import { ArrowBackOutlined, SaveOutlined } from "@mui/icons-material";
import AdminLayout from "../layout/AdminLayout";
import { http } from "../api/http";

type DetailResource = {
  id: number;
  estado: string;
  score: number | null;
  clasificacion: string | null;
  confianza: number | null;
  modelo: string | null;
  modelo_version: string | null;
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

export default function ResultadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DetailResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Observaciones states (UI ONLY for now as requested)
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
        console.error("Error cargando detalle:", err);
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
      setTimeout(() => setSavedOk(false), 3000); // Hide success after 3s
    } catch (err) {
      console.error("Error guardando observaciones:", err);
      // Optional: show a toast or alert, but for now we just log it as per UX simplicity
      // Or we can just set an error state if we want, but letting the user know is good.
      alert("No se pudieron guardar las observaciones.");
    } finally {
      setSavingObs(false);
    }
  };

  const getStatusChip = (status: string) => {
    const isCompleted = status === "completado";
    return <Chip label={status} color={isCompleted ? "success" : "default"} size="small" />;
  };

  const getClasificacionChip = (val: string | null) => {
    if (!val) return <Chip label="-" size="small" variant="outlined" />;
    let color: "default" | "success" | "warning" | "error" = "default";
    if (val.toLowerCase().includes("alto")) color = "error";
    else if (val.toLowerCase().includes("moderado") || val.toLowerCase().includes("medio")) color = "warning";
    else if (val.toLowerCase().includes("bajo")) color = "success";
    return <Chip label={val} color={color} size="small" variant="outlined" />;
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
  const nombreCompleto = [paciente.nombre, paciente.ap_paterno, paciente.ap_materno].filter(Boolean).join(" ");
  const fechaEncuentro = encuentro?.fecha ? new Date(encuentro.fecha).toLocaleDateString() : new Date(data.createdAt).toLocaleDateString();

  return (
    <AdminLayout
      title="Detalle del Análisis"
      subtitle={`Resultados para ${nombreCompleto}`}
    >
      <Box sx={{ maxWidth: 1000, mx: "auto", mt: 2, pb: 8 }}>
        <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate("/resultados")} sx={{ mb: 3 }}>
          Volver a Resultados
        </Button>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={4}>
              {/* DATOS CLÍNICOS */}
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
                        <Typography color="text.secondary" fontWeight={600}>Tipo de encuentro</Typography>
                        <Typography sx={{ textTransform: "capitalize" }}>{encuentro?.tipo_encuentro || "N/A"}</Typography>
                      </Grid>
                    </Grid>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Motivo</Typography>
                      <Typography>{encuentro?.motivo || "N/A"}</Typography>
                    </Box>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Resumen/Contexto</Typography>
                      <Typography>{encuentro?.resumen || "—"}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* ARCHIVO ANALIZADO */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" mb={2}>
                    Archivo Analizado
                  </Typography>

                  <Stack spacing={2} sx={{ "& .MuiTypography-root": { fontSize: 14 } }}>
                    <Box>
                      <Typography color="text.secondary" fontWeight={600}>Nombre</Typography>
                      <Typography>{data.archivo.nombre_archivo}</Typography>
                    </Box>
                    <Grid container>
                      <Grid size={{ xs: 6 }}>
                        <Typography color="text.secondary" fontWeight={600}>Tipo MIME</Typography>
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
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={4}>
              {/* RESULTADOS IA */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "primary.main", borderRadius: 2, bgcolor: "background.paper" }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      Resultados del Modelo
                    </Typography>
                    {getStatusChip(data.estado)}
                  </Stack>

                  <Grid container spacing={3} sx={{ mt: 1, "& .MuiTypography-root": { fontSize: 14 } }}>
                    <Grid size={{ xs: 6 }}>
                      <Typography color="text.secondary" fontWeight={600}>Score Global</Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        {data.score ? data.score.toFixed(2) : "-"}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography color="text.secondary" fontWeight={600}>Clasificación</Typography>
                      <Box mt={0.5}>{getClasificacionChip(data.clasificacion)}</Box>
                    </Grid>
                    
                    <Grid size={{ xs: 12 }}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>

                    <Grid size={{ xs: 4 }}>
                      <Typography color="text.secondary" fontWeight={600}>Confianza</Typography>
                      <Typography>{data.confianza ? `${(data.confianza * 100).toFixed(1)}%` : "-"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography color="text.secondary" fontWeight={600}>Modelo</Typography>
                      <Typography sx={{ textTransform: "capitalize" }}>{data.modelo || "-"}</Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography color="text.secondary" fontWeight={600}>Versión</Typography>
                      <Typography>{data.modelo_version || "-"}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* OBSERVACIONES DEL PROFESIONAL */}
              <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="bold" mb={2}>
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
