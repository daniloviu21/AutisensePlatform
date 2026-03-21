import { useState, useCallback, useEffect, useMemo } from "react";
import { alpha, Box, Button, InputAdornment, Paper, Stack, TextField, Tooltip, Typography, useTheme, IconButton } from "@mui/material";
import { Search, DownloadOutlined, EventOutlined, HelpOutline } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import type { GridColDef, GridPaginationModel, GridRenderCellParams, GridSortModel } from "@mui/x-data-grid";
import { format } from "date-fns";

import { http } from "../api/http";
import AdminLayout from "../layout/AdminLayout";

type AuditLog = {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entity: string | null;
  entityId: number | null;
  detail: string | null;
  ip: string | null;
  statusCode: number | null;
  createdAt: string;
};

type LogsResponse = {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  LOGIN_OK: "El usuario inició sesión exitosamente.",
  LOGIN_ERROR: "El usuario falló al iniciar sesión.",
  LOGOUT: "El usuario cerró sesión.",
  USER_CREATED: "Se registró un nuevo usuario.",
  USER_UPDATED: "Se actualizaron los datos del usuario.",
  USER_STATUS_CHANGED: "Se cambió el estado del usuario.",
  PACIENTE_CREATED: "Se registró un nuevo paciente.",
  PACIENTE_UPDATED: "Se actualizaron los datos del paciente.",
  PACIENTE_STATUS_CHANGED: "Se cambió el estado del paciente.",
  PACIENTE_TUTOR_LINKED: "Se vinculó un tutor al paciente.",
  PACIENTE_TUTOR_UNLINKED: "Se desvinculó un tutor del paciente.",
  PROFESIONAL_CREATED: "Se registró un profesional.",
  PROFESIONAL_UPDATED: "Se actualizaron los datos del profesional.",
  PROFESIONAL_STATUS_CHANGED: "Se cambió el estado del profesional.",
  TUTOR_CREATED: "Se registró un tutor.",
  TUTOR_UPDATED: "Se actualizaron los datos del tutor.",
  TUTOR_STATUS_CHANGED: "Se cambió el estado del tutor.",
  CLINICA_CREATED: "Se registró una clínica.",
  CLINICA_UPDATED: "Se actualizaron los datos de la clínica.",
  CLINICA_DELETED: "La clínica fue suspendida.",
  MFA_VERIFIED: "Código MFA verificado con éxito.",
  MFA_SETUP: "El usuario configuró y activó su MFA.",
};

const PAGE_SIZE = 20;

export default function LogsPage() {
  const theme = useTheme();

  const [rows, setRows] = useState<AuditLog[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);

  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await http.get<LogsResponse>("/audit-logs", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          action: actionFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setRows((data as any).data || []);
      setTotalRows((data as any).total || 0);
    } catch (e) {
      console.error("Error cargando logs:", e);
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, actionFilter, fromDate, toDate]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [actionFilter, fromDate, toDate]);

  const handleExportCSV = () => {
    const headers = ["ID", "Email", "Rol", "Acción", "Entidad", "ID Entidad", "IP", "Status", "Fecha"];
    const csvContent = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.userEmail || "",
          r.userRole || "",
          r.action,
          r.entity || "",
          r.entityId || "",
          r.ip || "",
          r.statusCode || "",
          r.createdAt ? new Date(r.createdAt).toISOString() : "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo<GridColDef<AuditLog>[]>(
    () => [
      {
        field: "action",
        headerName: "Acción",
        flex: 1,
        minWidth: 150,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Acción</span>
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<AuditLog, string>) => {
          const actionText = params.row.action;
          const description = ACTION_DESCRIPTIONS[actionText] || "Acción registrada en el sistema.";
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ fontWeight: 700 }}>{actionText}</Typography>
              <Tooltip title={description} placement="top" arrow>
                <HelpOutline sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        field: "userEmail",
        headerName: "Usuario",
        flex: 1.5,
        minWidth: 200,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Usuario</span>
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<AuditLog, string | null>) => (
          <Typography noWrap>{params.row.userEmail || "Sistema"}</Typography>
        ),
      },
      {
        field: "entity",
        headerName: "Entidad",
        flex: 1,
        minWidth: 150,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Entidad</span>
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<AuditLog, string | null>) => (
          <Typography noWrap>
            {params.row.entity ? `${params.row.entity} (${params.row.entityId || "-"})` : "-"}
          </Typography>
        ),
      },
      {
        field: "ip",
        headerName: "IP",
        flex: 0.8,
        minWidth: 120,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>IP</span>
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<AuditLog, string | null>) => (
           <Typography noWrap>{params.row.ip || "-"}</Typography>
        )
      },
      {
        field: "createdAt",
        headerName: "Fecha",
        flex: 1.2,
        minWidth: 180,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Fecha</span>
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<AuditLog, string>) => (
          <Typography noWrap>
            {params.row.createdAt ? format(new Date(params.row.createdAt), "dd/MM/yyyy HH:mm:ss") : "-"}
          </Typography>
        ),
      },
    ],
    []
  );

  return (
    <AdminLayout
      title="Logs de Auditoría"
      subtitle="Monitorea las acciones realizadas en el sistema."
      actions={
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadOutlined />}
          onClick={handleExportCSV}
          disabled={rows.length === 0}
        >
          Exportar CSV
        </Button>
      }
    >
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(255,255,255,0.02)"
                : "rgba(15,23,42,0.02)",
          }}
        >
          <TextField
            size="small"
            placeholder="Filtrar por acción"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            fullWidth
            sx={{ maxWidth: { md: 250 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            size="small"
            type="date"
            label="Desde"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            fullWidth
            sx={{ maxWidth: { md: 180 } }}
          />

          <TextField
            size="small"
            type="date"
            label="Hasta"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            fullWidth
            sx={{ maxWidth: { md: 180 } }}
          />
        </Box>

        <Box sx={{ width: "100%", minHeight: 420 }}>
          <DataGrid
            rows={rows}
            rowCount={totalRows}
            columns={columns}
            localeText={esES.components.MuiDataGrid.defaultProps.localeText}
            disableRowSelectionOnClick
            disableColumnMenu
            disableColumnResize
            paginationMode="server"
            pagination
            paginationModel={paginationModel}
            onPaginationModelChange={(model) =>
              setPaginationModel({
                page: model.page,
                pageSize: PAGE_SIZE,
              })
            }
            pageSizeOptions={[PAGE_SIZE]}
            loading={loading}
            sx={{
              border: 0,
              minHeight: 420,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(15,23,42,0.02)",
                borderBottom: "1px solid",
                borderColor: "divider",
              },
              "& .MuiDataGrid-columnHeaderTitleContainer": { padding: 0 },
              "& .MuiDataGrid-sortIcon": { display: "none" },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 800,
                fontSize: 13,
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.06)",
                display: "flex",
                alignItems: "center",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(15,23,42,0.02)",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "1px solid",
                borderColor: "divider",
              },
            }}
          />
        </Box>
      </Paper>
    </AdminLayout>
  );
}
