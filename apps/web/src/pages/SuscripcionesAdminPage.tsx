import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Chip,
  alpha,
  useTheme,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Search,
  FilterAltOutlined,
  VisibilityOutlined,
  ReceiptLongOutlined,
  ApartmentOutlined,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../layout/AdminLayout";
import { http } from "../api/http";
import SuscripcionAdminDetailDialog from "../components/SuscripcionAdminDetailDialog";
import { CalendarMonthOutlined, PaymentsOutlined } from "@mui/icons-material";

export default function SuscripcionesAdminPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [planFilter, setPlanFilter] = useState("todos");

  // Detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSuscripcionId, setSelectedSuscripcionId] = useState<number | null>(null);

  const loadSuscripciones = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/suscripciones/admin", {
        params: {
          q: search || undefined,
          estado: estadoFilter,
          plan: planFilter,
          page: page + 1,
          pageSize,
        },
      });
      setRows(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Error al cargar suscripciones admin:", error);
    } finally {
      setLoading(false);
    }
  }, [search, estadoFilter, planFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuscripciones();
    }, 400);
    return () => clearTimeout(timer);
  }, [loadSuscripciones]);

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "activa") return { color: "#0F766E", bg: alpha("#2A9D8F", 0.14), label: "Activa" };
    if (s === "cancelada") return { color: "#B91C1C", bg: alpha("#EF4444", 0.14), label: "Cancelada" };
    if (s === "expirada") return { color: "#9A3412", bg: alpha("#F59E0B", 0.18), label: "Expirada" };
    return { color: "#666", bg: "#eee", label: status || "N/A" };
  };

  const getPlanColor = (plan: string) => {
    const p = plan?.toLowerCase() || "";
    if (p.includes("anual")) return { color: "#7C3AED", bg: alpha("#7C3AED", 0.1) }; // Violeta
    if (p.includes("pro")) return { color: "#2563EB", bg: alpha("#2563EB", 0.1) }; // Blue
    return { color: "#0891B2", bg: alpha("#0891B2", 0.1) }; // Cyan
  };

  const handleOpenDetail = (id: number) => {
    setSelectedSuscripcionId(id);
    setDetailOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: "clinica",
      headerName: "Clínica",
      flex: 1.5,
      minWidth: 220,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), color: "primary.main", display: "flex" }}>
            <ApartmentOutlined sx={{ fontSize: 18 }} />
          </Box>
          <Typography variant="body2" fontWeight="800" sx={{ color: "text.primary" }}>
            {params.row.clinica?.nombre || "N/A"}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "plan_nombre",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => {
        const style = getPlanColor(params.value);
        return (
          <Chip 
            label={params.value?.toUpperCase()} 
            size="small" 
            sx={{ fontWeight: 800, fontSize: "0.65rem", color: style.color, bgcolor: style.bg, height: 24, borderRadius: 1.5 }} 
          />
        );
      },
    },
    {
      field: "estado",
      headerName: "Estado",
      width: 110,
      renderCell: (params: GridRenderCellParams) => {
        const style = getStatusStyle(params.value);
        return <Chip label={style.label} size="small" sx={{ fontWeight: 800, color: style.color, bgcolor: style.bg, borderRadius: 1.5 }} />;
      },
    },
    {
      field: "fecha_fin",
      headerName: "Vencimiento",
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarMonthOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight="600">{new Date(params.value).toLocaleDateString()}</Typography>
        </Stack>
      ),
    },
    {
      field: "monto",
      headerName: "Monto",
      width: 140,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams) => (
        <Typography fontWeight="900" sx={{ color: "success.main" }}>
          ${params.row.monto.toLocaleString()} <Box component="span" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{params.row.moneda}</Box>
        </Typography>
      ),
    },
    {
      field: "ultimo_pago",
      headerName: "Último Pago",
      width: 160,
      renderCell: (params: GridRenderCellParams) => {
        const p = params.row.pagos?.[0];
        if (!p) return <Typography color="text.secondary" variant="caption" sx={{ fontStyle: "italic" }}>Sin historial</Typography>;
        return (
          <Stack spacing={-0.2}>
            <Typography variant="caption" fontWeight="800">{new Date(p.fecha_pago).toLocaleDateString()}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: p.estado === "pagado" ? "success.main" : "error.main" }} />
              <Typography variant="caption" sx={{ color: p.estado === "pagado" ? "success.main" : "error.main", fontWeight: 700, fontSize: "0.65rem" }}>
                {p.estado.toUpperCase()}
              </Typography>
            </Stack>
          </Stack>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title="Ver Detalles Completos">
          <IconButton size="small" onClick={() => handleOpenDetail(params.row.id)} sx={{ color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.05), "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
            <VisibilityOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <AdminLayout title="Administración de Suscripciones" subtitle="Supervisión global de ingresos y estados de planes por clínica.">
      <Stack spacing={3}>
        {/* Filtros */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Buscar clínica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ color: "text.secondary", mr: 1, fontSize: 20 }} />,
              }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              select
              size="small"
              label="Estado"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="todos">Todos los estados</MenuItem>
              <MenuItem value="activa">Activa</MenuItem>
              <MenuItem value="cancelada">Cancelada</MenuItem>
              <MenuItem value="expirada">Expirada</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Plan"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="todos">Todos los planes</MenuItem>
              <MenuItem value="mensual">Mensual</MenuItem>
              <MenuItem value="anual">Anual</MenuItem>
              <MenuItem value="pro_mensual">Pro Mensual</MenuItem>
            </TextField>
          </Stack>
        </Paper>

        {/* Tabla */}
        <Paper elevation={0} sx={{ borderRadius: 2, background: "transparent", overflow: "hidden", minHeight: 400 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            rowCount={total}
            autoHeight
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(m) => {
              setPage(m.page);
              setPageSize(m.pageSize);
            }}
            localeText={esES.components.MuiDataGrid.defaultProps.localeText}
            disableRowSelectionOnClick
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                borderBottom: "none",
                borderRadius: "12px 12px 0 0",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "none",
              },
              "& .MuiDataGrid-row": {
                borderBottom: "none",
                mb: 0.5,
                bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.background.paper, 0.4) : "#fff",
                borderRadius: 2,
                boxShadow: theme.palette.mode === "light" ? "0 1px 3px rgba(0,0,0,0.02)" : "none",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                },
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
              },
              "& .MuiDataGrid-virtualScroller": {
                 mt: 0.5,
              }
            }}
          />
        </Paper>
      </Stack>

      <SuscripcionAdminDetailDialog 
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        suscripcionId={selectedSuscripcionId}
      />
    </AdminLayout>
  );
}
