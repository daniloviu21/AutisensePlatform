import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
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
  alpha,
  useTheme,
  IconButton,
  Grid,
} from "@mui/material";
import {
  Close,
  ReceiptLongOutlined,
  CalendarMonthOutlined,
  ApartmentOutlined,
  CreditCardOutlined,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import { http } from "../api/http";

interface Props {
  open: boolean;
  onClose: () => void;
  suscripcionId: number | null;
}

export default function SuscripcionAdminDetailDialog({ open, onClose, suscripcionId }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (open && suscripcionId) {
      const loadDetail = async () => {
        try {
          setLoading(true);
          const res = await http.get(`/suscripciones/admin/${suscripcionId}`);
          setData(res.data);
        } catch (error) {
          console.error("Error al cargar detalle suscripcion admin:", error);
        } finally {
          setLoading(false);
        }
      };
      loadDetail();
    }
  }, [open, suscripcionId]);

  const getStatusChip = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "activa") return <Chip label="Activa" size="small" sx={{ fontWeight: 800, color: "#0F766E", bgcolor: alpha("#2A9D8F", 0.14) }} />;
    if (s === "cancelada") return <Chip label="Cancelada" size="small" sx={{ fontWeight: 800, color: "#B91C1C", bgcolor: alpha("#EF4444", 0.14) }} />;
    if (s === "expirada") return <Chip label="Expirada" size="small" sx={{ fontWeight: 800, color: "#9A3412", bgcolor: alpha("#F59E0B", 0.18) }} />;
    return <Chip label={status} size="small" />;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ p: 3, pb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ReceiptLongOutlined color="primary" />
          <Typography variant="h6" fontWeight="800">Detalle de Suscripción</Typography>
        </Stack>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} />
          </Box>
        ) : data ? (
          <Stack spacing={4}>
            {/* Header / Resumen */}
            <Box>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ApartmentOutlined fontSize="small" color="action" />
                      <Typography variant="overline" fontWeight="700" color="text.secondary">CLÍNICA</Typography>
                    </Stack>
                    <Typography variant="h5" fontWeight="900" color="primary.main">{data.clinica?.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary">ID Clínica: #{data.id_clinica}</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1} alignItems={{ md: "flex-end" }}>
                    <Typography variant="overline" fontWeight="700" color="text.secondary">ESTADO ACTUAL</Typography>
                    {getStatusChip(data.estado)}
                    <Typography variant="h6" fontWeight="800" sx={{ textTransform: "capitalize" }}>Plan {data.plan_nombre}</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ borderStyle: "dashed" }} />

            {/* Fechas y Monto */}
            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight="700" color="text.secondary">FECHA INICIO</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
                    <Typography variant="body2" fontWeight="700">{new Date(data.fecha_inicio).toLocaleDateString()}</Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight="700" color="text.secondary">VENCIMIENTO</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarMonthOutlined sx={{ fontSize: 16, color: "error.main" }} />
                    <Typography variant="body2" fontWeight="700" color="error.main">{new Date(data.fecha_fin).toLocaleDateString()}</Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight="700" color="text.secondary">MONTO RECURRENTE</Typography>
                  <Typography variant="body2" fontWeight="800">${data.monto.toLocaleString()} {data.moneda}</Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" fontWeight="700" color="text.secondary">RENOVACIÓN</Typography>
                  <Chip
                    label={data.auto_renovar ? "AUTO" : "MANUAL"}
                    size="small"
                    variant="outlined"
                    color={data.auto_renovar ? "success" : "default"}
                    sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }}
                  />
                </Stack>
              </Grid>
            </Grid>

            {/* Historial de Pagos */}
            <Box>
              <Typography variant="subtitle2" fontWeight="800" mb={1.5}>Historial de Pagos</Typography>
              <TableContainer sx={{ border: "1px solid", borderColor: alpha(theme.palette.divider, 0.1), borderRadius: 2 }}>
                <Table size="small" sx={{ "& td, & th": { borderBottom: "none" } }}>
                  <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Fecha</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Monto</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Método</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.5 }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.pagos?.length > 0 ? data.pagos.map((p: any) => (
                      <TableRow key={p.id} hover sx={{ "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.01) } }}>
                        <TableCell sx={{ py: 1.5 }}>{new Date(p.fecha_pago).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700, py: 1.5 }}>${p.monto.toLocaleString()} {p.moneda}</TableCell>
                        <TableCell sx={{ textTransform: "capitalize", py: 1.5 }}>{p.metodo}</TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip
                            label={p.estado.toUpperCase()}
                            size="small"
                            color={p.estado === "pagado" ? "success" : "error"}
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: "0.6rem", height: 18 }}
                          />
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>No hay pagos registrados</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        ) : (
          <Typography color="error">No se pudo cargar la información.</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
