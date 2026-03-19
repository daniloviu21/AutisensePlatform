import {
  Add,
  ArrowDownward,
  ArrowUpward,
  EditOutlined,
  InfoOutlined,
  PauseCircleOutline,
  PlayCircleOutline,
  Search,
  SettingsOutlined,
  SwapVert,
} from "@mui/icons-material";
import {
  alpha,
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Slide,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import type { SlideProps } from "@mui/material/Slide";
import { DataGrid } from "@mui/x-data-grid";
import type {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
  GridRenderCellParams,
  GridSortModel,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { useCallback, useEffect, useMemo, useState } from "react";

import { http } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import AdminLayout from "../layout/AdminLayout";
import TutorFormDialog, {
  type ClinicOption,
  type TutorFormValues,
  type TutorStatus,
} from "../components/tutores/TutorFormDialog";
import TutorDetailPanel from "../components/tutores/TutorDetailPanel";

type TutorRow = {
  id: number;
  usuarioId: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  nombreCompleto: string;
  telefono: string | null;
  correo: string;
  estado: TutorStatus;
  clinicaId: number | null;
  clinicaNombre: string | null;
  pacientesVinculados: number;
  mfaEnabled: boolean;
};

type ApiTutor = {
  id: number;
  usuarioId: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  nombreCompleto?: string;
  telefono: string | null;
  correo: string;
  estado: TutorStatus;
  clinicaId: number | null;
  clinicaNombre?: string | null;
  clinica?: { id: number; nombre: string; estado: string } | null;
  pacientesVinculados: number;
  mfaEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiTutor[];
};

type ClinicsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: number;
    nombre: string;
    estado: string;
  }>;
};

type ToastState = {
  open: boolean;
  severity: "success" | "error" | "info" | "warning";
  message: string;
};

const PAGE_SIZE = 10;

const localeText = {
  ...esES.components.MuiDataGrid.defaultProps.localeText,
  footerRowsPerPage: "Filas por página:",
};

const initialVisibilityModel: GridColumnVisibilityModel = {
  nombreCompleto: true,
  correo: true,
  telefono: true,
  clinicaNombre: true,
  pacientesVinculados: true,
  estado: true,
  rowActions: true,
};

function normalizeTutor(api: ApiTutor): TutorRow {
  return {
    id: api.id,
    usuarioId: api.usuarioId,
    nombre: api.nombre ?? "",
    ap_paterno: api.ap_paterno ?? "",
    ap_materno: api.ap_materno ?? null,
    nombreCompleto:
      api.nombreCompleto ??
      [api.nombre, api.ap_paterno, api.ap_materno].filter(Boolean).join(" ").trim(),
    telefono: api.telefono ?? null,
    correo: api.correo ?? "",
    estado: api.estado ?? "activo",
    clinicaId: api.clinicaId ?? null,
    clinicaNombre: api.clinicaNombre ?? api.clinica?.nombre ?? null,
    pacientesVinculados: api.pacientesVinculados ?? 0,
    mfaEnabled: api.mfaEnabled ?? false,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  const msg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error as { message?: string })?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

function statusColor(status: TutorStatus) {
  if (status === "activo") {
    return {
      label: "Activo",
      color: "#0F766E",
      bg: alpha("#2A9D8F", 0.14),
    };
  }

  if (status === "pendiente") {
    return {
      label: "Pendiente",
      color: "#9A3412",
      bg: alpha("#F59E0B", 0.18),
    };
  }

  return {
    label: "Suspendido",
    color: "#B91C1C",
    bg: alpha("#EF4444", 0.14),
  };
}

function EmptyState({
  loading,
  hasFilters,
}: {
  loading: boolean;
  hasFilters: boolean;
}) {
  if (loading) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ minHeight: 240, height: "100%", px: 2, textAlign: "center" }}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary">Cargando tutores...</Typography>
      </Stack>
    );
  }

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{
        minHeight: 240,
        height: "100%",
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
        No hay tutores para mostrar
      </Typography>
      <Typography color="text.secondary">
        {hasFilters
          ? "Ajusta la búsqueda o los filtros para intentar de nuevo."
          : "Crea un nuevo tutor para comenzar."}
      </Typography>
    </Stack>
  );
}

function ToastTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

type ColumnSettingsDialogProps = {
  open: boolean;
  model: GridColumnVisibilityModel;
  onClose: () => void;
  onToggle: (field: string) => void;
  onReset: () => void;
};

function ColumnSettingsDialog({
  open,
  model,
  onClose,
  onToggle,
  onReset,
}: ColumnSettingsDialogProps) {
  const columns = [
    { field: "nombreCompleto", label: "Tutor", required: true },
    { field: "correo", label: "Correo", required: false },
    { field: "telefono", label: "Teléfono", required: false },
    { field: "parentesco", label: "Parentesco", required: false },
    { field: "clinicaNombre", label: "Clínica", required: false },
    { field: "pacientesVinculados", label: "Pacientes", required: false },
    { field: "estado", label: "Estado", required: false },
  ];

  const visibleCount = columns.filter((column) => model[column.field] !== false).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Configurar columnas</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Selecciona las columnas que deseas mostrar.
          </Typography>

          <FormGroup>
            {columns.map((column) => {
              const checked = model[column.field] !== false;
              const disableUncheck = column.required || (checked && visibleCount === 1);

              return (
                <FormControlLabel
                  key={column.field}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => onToggle(column.field)}
                      disabled={disableUncheck}
                    />
                  }
                  label={column.label}
                />
              );
            })}
          </FormGroup>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onReset} color="inherit">
          Restablecer
        </Button>
        <Button onClick={onClose} variant="contained">
          Listo
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TutoresPage() {
  const theme = useTheme();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const canCreate = user?.role === "super_admin" || user?.role === "clinic_admin" || user?.role === "profesional";
  const canEdit = canCreate;
  const canToggleStatus = user?.role === "super_admin" || user?.role === "clinic_admin";
  const lockedClinicId = !isSuperAdmin ? (user?.clinicId ?? null) : null;

  const [rows, setRows] = useState<TutorRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | TutorStatus>("todos");
  const [clinicFilter, setClinicFilter] = useState<"todas" | number>(
    lockedClinicId ?? "todas"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingTutor, setEditingTutor] = useState<TutorRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(initialVisibilityModel);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "nombreCompleto", sort: "asc" },
  ]);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    severity: "success",
    message: "",
  });

  const showToast = useCallback((severity: ToastState["severity"], message: string) => {
    setToast({
      open: true,
      severity,
      message,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [debouncedSearch, statusFilter, clinicFilter]);

  const loadClinics = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      const { data } = await http.get<ClinicsListResponse>("/clinicas", {
        params: {
          page: 1,
          pageSize: 100,
          estado: "activa",
          sortField: "nombre",
          sortDirection: "asc",
        },
      });

      setClinics(
        (data.items ?? []).map((clinic) => ({
          id: clinic.id,
          nombre: clinic.nombre,
          estado: clinic.estado,
        }))
      );
    } catch (error) {
      setClinics([]);
      showToast("error", getErrorMessage(error, "No se pudieron cargar las clínicas."));
    }
  }, [isSuperAdmin, showToast]);

  const loadTutores = useCallback(async () => {
    try {
      setLoading(true);

      const activeSort = sortModel[0];
      const sortFieldMap: Record<string, string> = {
        nombreCompleto: "nombre",
        clinicaNombre: "clinicaNombre",
        pacientesVinculados: "pacientesVinculados",
        estado: "estado",
        correo: "correo",
        telefono: "telefono",
        parentesco: "parentesco",
      };

      const apiSortField = activeSort?.field
        ? sortFieldMap[activeSort.field] ?? activeSort.field
        : "nombre";

      const { data } = await http.get<ListResponse>("/tutores", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          q: debouncedSearch || undefined,
          estado: statusFilter === "todos" ? undefined : statusFilter,
          clinicaId: clinicFilter === "todas" ? undefined : clinicFilter,
          sortField: apiSortField,
          sortDirection: activeSort?.sort ?? "asc",
        },
      });

      setRows((data.items ?? []).map(normalizeTutor));
      setTotalRows(data.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotalRows(0);
      showToast("error", getErrorMessage(error, "No se pudieron cargar los tutores."));
    } finally {
      setLoading(false);
    }
  }, [
    clinicFilter,
    debouncedSearch,
    paginationModel.page,
    paginationModel.pageSize,
    showToast,
    sortModel,
    statusFilter,
  ]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    void loadTutores();
  }, [loadTutores]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingTutor(null);
    setDialogOpen(true);
  };

  const openEdit = (row: TutorRow) => {
    setDialogMode("edit");
    setEditingTutor(row);
    setDialogOpen(true);
  };

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const handleSave = async (values: TutorFormValues) => {
    try {
      setFormSubmitting(true);

      const payload = {
        ...values,
        clinicaId: lockedClinicId ?? values.clinicaId,
      };

      if (dialogMode === "create") {
        await http.post("/tutores", payload);
        showToast("success", "El tutor se registró correctamente.");
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      } else if (editingTutor) {
        await http.put(`/tutores/${editingTutor.id}`, payload);
        showToast("success", "El tutor se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingTutor(null);
      await loadTutores();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo guardar el tutor."));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (row: TutorRow) => {
    const nextState: TutorStatus =
      row.estado === "activo" ? "suspendido" : "activo";

    try {
      await http.patch(`/tutores/${row.id}/status`, {
        estado: nextState,
      });

      showToast(
        "success",
        nextState === "activo"
          ? "El tutor fue reactivado correctamente."
          : "El tutor fue suspendido correctamente."
      );

      await loadTutores();
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, "No se pudo actualizar el estado del tutor.")
      );
    }
  };

  const toggleColumn = (field: string) => {
    if (field === "nombreCompleto") return;

    setColumnVisibilityModel((prev) => {
      const nextValue = !(prev[field] !== false);

      const nextModel = {
        ...prev,
        [field]: nextValue,
      };

      const protectedFields = [
        "nombreCompleto",
        "correo",
        "telefono",
        "parentesco",
        "clinicaNombre",
        "pacientesVinculados",
        "estado",
      ];

      const visibleCount = protectedFields.filter((key) => nextModel[key] !== false).length;

      if (visibleCount === 0) {
        return prev;
      }

      return nextModel;
    });
  };

  const resetColumns = () => {
    setColumnVisibilityModel(initialVisibilityModel);
  };

  const renderSortIcon = (field: string) => {
    const active = sortModel[0]?.field === field ? sortModel[0]?.sort : null;

    if (active === "asc") return <ArrowUpward sx={{ fontSize: 16 }} />;
    if (active === "desc") return <ArrowDownward sx={{ fontSize: 16 }} />;
    return <SwapVert sx={{ fontSize: 16, opacity: 0.55 }} />;
  };

  const columns = useMemo<GridColDef<TutorRow>[]>(
    () => [
      {
        field: "nombreCompleto",
        headerName: "Tutor",
        flex: 1.2,
        minWidth: 240,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Tutor</span>
            {renderSortIcon("nombreCompleto")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => (
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{
                width: 30,
                height: 30,
                fontSize: 13,
                fontWeight: 700,
                bgcolor:
                  theme.palette.mode === "dark"
                    ? "rgba(42,157,143,0.18)"
                    : "rgba(42,157,143,0.14)",
                color: "primary.main",
              }}
            >
              {(params.row.nombre?.charAt(0) ?? "T").toUpperCase()}
            </Avatar>

            <Typography sx={{ fontWeight: 700 }} noWrap>
              {params.row.nombreCompleto}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "correo",
        headerName: "Correo",
        flex: 1.1,
        minWidth: 240,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Correo</span>
            {renderSortIcon("correo")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => (
          <Typography noWrap>{params.row.correo}</Typography>
        ),
      },
      {
        field: "telefono",
        headerName: "Teléfono",
        flex: 0.85,
        minWidth: 160,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Teléfono</span>
            {renderSortIcon("telefono")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => (
          <Typography noWrap color={params.row.telefono ? "text.primary" : "text.secondary"}>
            {params.row.telefono || "—"}
          </Typography>
        ),
      },
      {
        field: "clinicaNombre",
        headerName: "Clínica",
        flex: 1,
        minWidth: 190,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Clínica</span>
            {renderSortIcon("clinicaNombre")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => (
          <Typography noWrap>{params.row.clinicaNombre ?? "—"}</Typography>
        ),
      },
      {
        field: "pacientesVinculados",
        headerName: "Pacientes",
        flex: 0.85,
        minWidth: 150,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Pacientes</span>
            {renderSortIcon("pacientesVinculados")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => {
          const count = params.row.pacientesVinculados;

          return (
            <Chip
              label={count === 0 ? "Sin vincular" : `${count} paciente${count !== 1 ? "s" : ""}`}
              size="small"
              sx={{
                fontWeight: 700,
                color: count > 0 ? "#0F766E" : "#6B7280",
                backgroundColor: count > 0 ? alpha("#2A9D8F", 0.14) : alpha("#6B7280", 0.1),
              }}
            />
          );
        },
      },
      {
        field: "estado",
        headerName: "Estado",
        flex: 0.7,
        minWidth: 130,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Estado</span>
            {renderSortIcon("estado")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<TutorRow>) => {
          const styles = statusColor(params.row.estado);

          return (
            <Chip
              label={styles.label}
              size="small"
              sx={{
                fontWeight: 700,
                color: styles.color,
                backgroundColor: styles.bg,
              }}
            />
          );
        },
      },
      {
        field: "rowActions",
        headerName: "",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        width: 126,
        minWidth: 126,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<TutorRow>) => (
          <Box
            className="row-actions"
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              pointerEvents: "none",
              transition: "opacity .15s ease",
            }}
          >
            <Stack direction="row" spacing={0.25} alignItems="center" justifyContent="center">
              <Tooltip title="Ver detalle">
                <IconButton size="small" onClick={() => openDetail(params.row.id)}>
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>

              {canEdit && (
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => openEdit(params.row)}>
                    <EditOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {canToggleStatus && (
                <Tooltip
                  title={params.row.estado === "activo" ? "Suspender" : "Reactivar"}
                >
                  <IconButton size="small" onClick={() => handleToggleStatus(params.row)}>
                    {params.row.estado === "activo" ? (
                      <PauseCircleOutline fontSize="small" />
                    ) : (
                      <PlayCircleOutline fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Box>
        ),
      },
    ],
    [sortModel, theme.palette.mode, canEdit, canToggleStatus]
  );

  const hasFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== "todos" ||
    clinicFilter !== "todas";

  return (
    <AdminLayout
      title="Tutores"
      subtitle="Gestión de tutores y su vinculación con pacientes"
      actions={
        canCreate ? (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2,
              height: 40,
              boxShadow: "none",
            }}
          >
            Nuevo tutor
          </Button>
        ) : undefined
      }
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "grid",
            gridTemplateColumns: isSuperAdmin
              ? { xs: "1fr", xl: "1fr 180px 220px 48px" }
              : { xs: "1fr", xl: "1fr 180px 48px" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Buscar por nombre, correo o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            select
            fullWidth
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "todos" | TutorStatus)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="suspendido">Suspendido</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
          </TextField>

          {isSuperAdmin && (
            <TextField
              select
              fullWidth
              label="Clínica"
              value={clinicFilter}
              onChange={(e) =>
                setClinicFilter(e.target.value === "todas" ? "todas" : Number(e.target.value))
              }
            >
              <MenuItem value="todas">Todas las clínicas</MenuItem>
              {clinics.map((clinic) => (
                <MenuItem key={clinic.id} value={clinic.id}>
                  {clinic.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Tooltip title="Configurar columnas">
            <IconButton
              onClick={() => setColumnsDialogOpen(true)}
              sx={{
                width: 44,
                height: 44,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
              }}
            >
              <SettingsOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ width: "100%", minHeight: 420 }}>
          <DataGrid
            rows={rows}
            rowCount={totalRows}
            columns={columns}
            localeText={localeText}
            disableRowSelectionOnClick
            disableColumnMenu
            disableColumnResize
            columnVisibilityModel={columnVisibilityModel}
            onColumnVisibilityModelChange={setColumnVisibilityModel}
            sortingMode="server"
            sortModel={sortModel}
            onSortModelChange={(model) => {
              if (!model.length) {
                setSortModel([{ field: "nombreCompleto", sort: "asc" }]);
                return;
              }

              const next = model[0];

              if (!next || next.field === "rowActions") {
                setSortModel([{ field: "nombreCompleto", sort: "asc" }]);
                return;
              }

              setSortModel([next]);
            }}
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
            slots={{
              noRowsOverlay: () => <EmptyState loading={loading} hasFilters={hasFilters} />,
            }}
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
              "& .MuiDataGrid-columnHeaderTitleContainer": {
                padding: 0,
              },
              "& .MuiDataGrid-sortIcon": {
                display: "none",
              },
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
              "& .MuiDataGrid-row:hover .row-actions": {
                opacity: 1,
                pointerEvents: "auto",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "1px solid",
                borderColor: "divider",
              },
              "& .MuiTablePagination-selectLabel": {
                display: "none",
              },
              "& .MuiTablePagination-input": {
                display: "none",
              },
              "& .MuiDataGrid-columnSeparator": {
                display: "none",
              },
              "& .MuiDataGrid-overlayWrapper": {
                minHeight: 240,
              },
              "& .MuiDataGrid-overlayWrapperInner": {
                minHeight: 240,
              },
              "& .MuiDataGrid-virtualScroller": {
                minHeight: 240,
              },
            }}
          />
        </Box>
      </Paper>

      <TutorFormDialog
        open={dialogOpen}
        mode={dialogMode}
        defaultValues={
          dialogMode === "edit" && editingTutor
            ? {
              correo: editingTutor.correo,
              password: "",
              estado: editingTutor.estado,
              clinicaId: editingTutor.clinicaId,
              nombre: editingTutor.nombre,
              ap_paterno: editingTutor.ap_paterno,
              ap_materno: editingTutor.ap_materno ?? "",
              telefono: editingTutor.telefono ?? "",
            }
            : {
              clinicaId: lockedClinicId,
            }
        }
        clinics={clinics}
        submitting={formSubmitting}
        onClose={() => {
          if (formSubmitting) return;
          setDialogOpen(false);
          setEditingTutor(null);
        }}
        onSave={handleSave}
      />

      <TutorDetailPanel
        open={detailOpen}
        tutorId={detailId}
        onClose={() => setDetailOpen(false)}
      />

      <ColumnSettingsDialog
        open={columnsDialogOpen}
        model={columnVisibilityModel}
        onClose={() => setColumnsDialogOpen(false)}
        onToggle={toggleColumn}
        onReset={resetColumns}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={2600}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={ToastTransition}
      >
        <Alert
          elevation={6}
          variant="filled"
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ minWidth: 280 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}