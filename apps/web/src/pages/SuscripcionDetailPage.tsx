import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
} from "@mui/material";
import {
  ReceiptLongOutlined,
  CalendarMonthOutlined,
  CreditCardOutlined,
  ErrorOutlineOutlined,
  InfoOutlined,
} from "@mui/icons-material";
import AdminLayout from "../layout/AdminLayout";
import { http } from "../api/http";

export default function SuscripcionDetailPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [suscripcion, setSuscripcion] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const res = await http.get("/suscripciones/mi-clinica");
        setSuscripcion(res.data);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al cargar la información de tu suscripción.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Mi Suscripción">
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">Cargando detalles...</Typography>
        </Box>
      </AdminLayout>
    );
  }

  if (error || !suscripcion || suscripcion.message) {
    return (
      <AdminLayout title="Mi Suscripción">
        <Box sx={{ maxWidth: 500, mx: "auto", py: 8, textAlign: "center" }}>
          <ErrorOutlineOutlined sx={{ fontSize: 64, color: "error.light", mb: 2 }} />
          <Typography variant="h6" fontWeight="800" gutterBottom>Sin información disponible</Typography>
          <Typography color="text.secondary" mb={4}>
            {error || "No logramos encontrar una suscripción activa para tu clínica."}
          </Typography>
          <Alert severity="info" variant="outlined" sx={{ textAlign: "left" }}>
            Si acabas de registrarte, es posible que el sistema esté procesando tu alta. Si el problema persiste, contacta a soporte.
          </Alert>
        </Box>
      </AdminLayout>
    );
  }

  const getStatusChip = (status: string) => {
    const s = status.toLowerCase();
    const config: any = {
      activa: { color: "#0F766E", bg: alpha("#2A9D8F", 0.14), label: "Activa" },
      cancelada: { color: "#B91C1C", bg: alpha("#EF4444", 0.14), label: "Cancelada" },
      expirada: { color: "#9A3412", bg: alpha("#F59E0B", 0.18), label: "Expirada" },
    };
    const c = config[s] || { color: "text.primary", bg: "action.hover", label: status };
    return <Chip label={c.label} size="small" sx={{ fontWeight: 800, color: c.color, bgcolor: c.bg, borderRadius: 1.5 }} />;
  };

  return (
    <AdminLayout title="Mi Suscripción" subtitle="Detalles operativos de tu plan y facturación.">
      <Grid container spacing={3}>
        {/* Card Resumen Operativo */}
        <Grid sx={{ gridColumn: "span 12" }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Grid container spacing={4}>
              <Grid sx={{ gridColumn: { xs: "span 12", md: "span 4" } }}>
                <Stack spacing={0.5}>
                  <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing="1px">PLAN ACTUAL</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="h4" fontWeight="900" sx={{ color: "primary.main" }}>
                      {suscripcion.plan_nombre.toUpperCase()}
                    </Typography>
                    {getStatusChip(suscripcion.estado)}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ${suscripcion.monto.toLocaleString()} {suscripcion.moneda} / pago recurrente
                  </Typography>
                </Stack>
              </Grid>

              <Grid sx={{ gridColumn: { xs: "span 12", md: "span 8" } }}>
                <Grid container spacing={3}>
                  <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 4" } }}>
                    <Stack spacing={1} direction="row" alignItems="center">
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: "action.hover", display: "flex" }}>
                        <CalendarMonthOutlined color="primary" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">INICIO</Typography>
                        <Typography variant="body2" fontWeight="700">{new Date(suscripcion.fecha_inicio).toLocaleDateString()}</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 4" } }}>
                    <Stack spacing={1} direction="row" alignItems="center">
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: "action.hover", display: "flex" }}>
                        <CalendarMonthOutlined color="error" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">VENCIMIENTO</Typography>
                        <Typography variant="body2" fontWeight="700">{new Date(suscripcion.fecha_fin).toLocaleDateString()}</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid sx={{ gridColumn: { xs: "span 12", sm: "span 4" } }}>
                    <Stack spacing={1} direction="row" alignItems="center">
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: "action.hover", display: "flex" }}>
                        <CreditCardOutlined color="action" fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="600">MÉTODO</Typography>
                        <Typography variant="body2" fontWeight="700">Tarjeta **** 4242</Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Historial de Pagos */}
        <Grid sx={{ gridColumn: "span 12" }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <ReceiptLongOutlined fontSize="small" color="action" />
            <Typography variant="h6" fontWeight="800">Historial de Pagos</Typography>
          </Stack>
          
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>FECHA</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>CONCEPTO</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>MONTO</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>MÉTODO</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: "text.secondary" }}>ESTADO</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suscripcion.pagos?.length > 0 ? (
                  suscripcion.pagos.map((pago: any) => (
                    <TableRow key={pago.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{new Date(pago.fecha_pago).toLocaleDateString()}</TableCell>
                      <TableCell>Suscripción Plan {suscripcion.plan_nombre}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>${pago.monto.toLocaleString()} {pago.moneda}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{pago.metodo}</TableCell>
                      <TableCell>
                        <Chip
                          label={pago.estado.toUpperCase()}
                          size="small"
                          sx={{ 
                            fontWeight: 800, 
                            fontSize: "0.65rem",
                            bgcolor: pago.estado === "pagado" ? alpha("#10B981", 0.1) : "action.hover",
                            color: pago.estado === "pagado" ? "#059669" : "text.secondary"
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" color="text.secondary">
                        <InfoOutlined fontSize="small" />
                        <Typography variant="body2">No hay pagos registrados aún.</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}

