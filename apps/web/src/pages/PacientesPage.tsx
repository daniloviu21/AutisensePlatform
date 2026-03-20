import {
  Add,
  ArrowDownward,
  ArrowUpward,
  CheckBoxOutlineBlank,
  Close,
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
  CircularProgress,
  Chip,
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
import PacienteFormDialog, {
  type ClinicOption,
  type PacienteFormValues,
  type PacienteStatus,
} from "../components/pacientes/PacienteFormDialog";
import PacienteDetailPanel from "../components/pacientes/PacienteDetailPanel";

type PacienteRow = {
  id: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  fecha_nacimiento: string;
  sexo: string;
  escolaridad: string | null;
  estado: PacienteStatus;
  diagnostico_presuntivo: string | null;
  antecedentes_relevantes: string | null;
  notas_generales: string | null;
  clinicaId: number | null;
  clinicaNombre: string | null;
};

type ApiPaciente = {
  id: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  fecha_nacimiento: string;
  sexo: string;
  escolaridad: string | null;
  estado: PacienteStatus;
  diagnostico_presuntivo: string | null;
  antecedentes_relevantes: string | null;
  notas_generales: string | null;
  id_clinica: number | null;
  clinicaNombre?: string | null;
  clinica?: {
    id: number;
    nombre: string;
    estado: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};
type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiPaciente[];
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
  nombre: true,
  diagnostico_presuntivo: true,
  clinicaNombre: true,
  estado: true,
  rowActions: true,
};

function normalizePaciente(apiPaciente: ApiPaciente): PacienteRow {
  return {
    id: apiPaciente.id,
    nombre: apiPaciente.nombre ?? "",
    ap_paterno: apiPaciente.ap_paterno ?? "",
    ap_materno: apiPaciente.ap_materno ?? "",
    fecha_nacimiento: apiPaciente.fecha_nacimiento ?? "",
    sexo: apiPaciente.sexo ?? "Otro",
    escolaridad: apiPaciente.escolaridad ?? "",
    estado: apiPaciente.estado ?? "activo",
    diagnostico_presuntivo: apiPaciente.diagnostico_presuntivo ?? "",
    antecedentes_relevantes: apiPaciente.antecedentes_relevantes ?? "",
    notas_generales: apiPaciente.notas_generales ?? "",
    clinicaId: apiPaciente.id_clinica ?? null,
    clinicaNombre: apiPaciente.clinicaNombre ?? apiPaciente.clinica?.nombre ?? null,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error as { message?: string })?.message;

  return typeof message === "string" && message.trim() ? message : fallback;
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
        <Typography color="text.secondary">Cargando pacientes...</Typography>
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
        No hay pacientes para mostrar
      </Typography>
      <Typography color="text.secondary">
        {hasFilters
          ? "Ajusta la búsqueda o los filtros para intentar de nuevo."
          : "Crea un nuevo paciente para comenzar."}
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
    { field: "nombre", label: "Paciente", required: true },
    { field: "diagnostico_presuntivo", label: "Diagnóstico", required: false },
    { field: "clinicaNombre", label: "Clínica", required: false },
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

function getNombreCompleto(row: PacienteRow) {
  return [row.nombre, row.ap_paterno, row.ap_materno].filter(Boolean).join(" ").trim();
}

function statusColor(status: PacienteStatus) {
  if (status === "activo") {
    return {
      color: "#0F766E",
      backgroundColor: alpha("#2A9D8F", 0.14),
      label: "Activo",
    };
  }

  return {
    color: "#B91C1C",
    backgroundColor: alpha("#EF4444", 0.14),
    label: "Inactivo",
  };
}

export default function PacientesPage() {
  const theme = useTheme();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const canCreate = user?.role === "super_admin" || user?.role === "clinic_admin" || user?.role === "profesional";
  const canEdit = canCreate;
  const canManageTutores = canCreate;
  const canToggleStatus =
    user?.role === "super_admin" || user?.role === "clinic_admin";

  const lockedClinicId = !isSuperAdmin ? (user?.clinicId ?? null) : null;

  const [rows, setRows] = useState<PacienteRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | PacienteStatus>("todos");
  const [clinicFilter, setClinicFilter] = useState<"todas" | number>(
    lockedClinicId ?? "todas"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingPaciente, setEditingPaciente] = useState<PacienteRow | null>(null);
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
    { field: "nombre", sort: "asc" },
  ]);

  const [loading, setLoading] = useState(false);

  // ── Multi-select ────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectMode = () => {
    setSelectMode((prev) => { if (prev) setSelectedIds(new Set()); return !prev; });
  };
  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allVisibleSelected;
  const toggleSelectAll = () => { if (allVisibleSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(rows.map((r) => r.id))); };

  const handleBulkToggleStatus = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const firstRow = rows.find((r) => r.id === ids[0]);
    if (!firstRow) return;
    const nextState: PacienteStatus = firstRow.estado === "activo" ? "inactivo" : "activo";
    try {
      await Promise.all(ids.map((id) => http.patch(`/pacientes/${id}/status`, { estado: nextState })));
      showToast("success",
        ids.length === 1
          ? nextState === "activo" ? "El paciente fue reactivado correctamente." : "El paciente fue desactivado correctamente."
          : nextState === "activo" ? `${ids.length} pacientes reactivados correctamente.` : `${ids.length} pacientes desactivados correctamente.`
      );
      setSelectedIds(new Set());
      await loadPacientes();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo actualizar el estado."));
    }
  };

  const [toast, setToast] = useState<ToastState>({
    open: false,
    severity: "success",
    message: "",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [debouncedSearch, statusFilter, clinicFilter]);

  const showToast = useCallback(
    (severity: ToastState["severity"], message: string) => {
      setToast({
        open: true,
        severity,
        message,
      });
    },
    []
  );

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

  const loadPacientes = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await http.get<ListResponse>("/pacientes", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          q: debouncedSearch || undefined,
          estado: statusFilter === "todos" ? undefined : statusFilter,
          clinicaId: clinicFilter === "todas" ? undefined : clinicFilter,
        },
      });

      let mapped = (data.items ?? []).map(normalizePaciente);

      const activeSort = sortModel[0];
      if (activeSort?.field && activeSort.sort) {
        const field = activeSort.field as keyof PacienteRow;
        const direction = activeSort.sort;

        mapped = [...mapped].sort((a, b) => {
          const left = String(a[field] ?? "").toLowerCase().trim();
          const right = String(b[field] ?? "").toLowerCase().trim();
          const result = left.localeCompare(right, "es", {
            sensitivity: "base",
            numeric: true,
          });
          return direction === "asc" ? result : -result;
        });
      }

      setRows(mapped);
      setTotalRows(data.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotalRows(0);
      showToast("error", getErrorMessage(error, "No se pudieron cargar los pacientes."));
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
    void loadPacientes();
  }, [loadPacientes]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingPaciente(null);
    setDialogOpen(true);
  };

  const openEdit = (row: PacienteRow) => {
    setDialogMode("edit");
    setEditingPaciente(row);
    setDialogOpen(true);
  };

  const openDetail = (id: number) => {
    setDetailId(id);
    setDetailOpen(true);
  };

  const handleSave = async (values: PacienteFormValues) => {
    try {
      setFormSubmitting(true);

      const payload = {
        ...values,
        clinicaId: lockedClinicId ?? values.clinicaId,
      };

      if (dialogMode === "create") {
        await http.post("/pacientes", payload);
        showToast("success", "El paciente se agregó correctamente.");
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      } else if (editingPaciente) {
        await http.put(`/pacientes/${editingPaciente.id}`, payload);
        showToast("success", "El paciente se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingPaciente(null);
      await loadPacientes();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo guardar el paciente."));
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: PacienteRow) => {
    void handleToggleStatus(row);
  };

  const handleToggleStatus = async (row: PacienteRow) => {
    const nextState: PacienteStatus = row.estado === "activo" ? "inactivo" : "activo";

    try {
      await http.patch(`/pacientes/${row.id}/status`, {
        estado: nextState,
      });

      showToast(
        "success",
        nextState === "activo"
          ? "El paciente fue reactivado correctamente."
          : "El paciente fue desactivado correctamente."
      );

      await loadPacientes();
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, "No se pudo actualizar el estado del paciente.")
      );
    }
  };

  const toggleColumn = (field: string) => {
    if (field === "nombre") return;

    setColumnVisibilityModel((prev) => {
      const nextValue = !(prev[field] !== false);

      const nextModel = {
        ...prev,
        [field]: nextValue,
      };

      const protectedFields = ["nombre", "diagnostico_presuntivo", "clinicaNombre", "estado"];
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

  const columns = useMemo<GridColDef<PacienteRow>[]>(
    () => [
      ...(selectMode
        ? [
          {
            field: "__select__",
            headerName: "",
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            width: 52,
            minWidth: 52,
            align: "center" as const,
            headerAlign: "center" as const,
            renderHeader: () => (<Checkbox size="small" checked={allVisibleSelected} indeterminate={someSelected} onChange={toggleSelectAll} />),
            renderCell: (params: GridRenderCellParams<PacienteRow>) => (<Checkbox size="small" checked={selectedIds.has(params.row.id)} onChange={() => toggleRowSelection(params.row.id)} />),
          } satisfies GridColDef<PacienteRow>,
        ] : []),
      {
        field: "nombre",
        headerName: "Paciente",
        flex: 1.3,
        minWidth: 260,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Paciente</span>
            {renderSortIcon("nombre")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<PacienteRow>) => (
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
              {params.row.nombre?.charAt(0)?.toUpperCase() ?? "P"}
            </Avatar>

            <Typography sx={{ fontWeight: 700 }} noWrap>
              {getNombreCompleto(params.row)}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "diagnostico_presuntivo",
        headerName: "Diagnóstico",
        flex: 1.15,
        minWidth: 220,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Diagnóstico</span>
            {renderSortIcon("diagnostico_presuntivo")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<PacienteRow>) => (
          <Typography noWrap color="text.secondary">
            {params.row.diagnostico_presuntivo || "—"}
          </Typography>
        ),
      },
      {
        field: "clinicaNombre",
        headerName: "Clínica",
        flex: 1,
        minWidth: 200,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Clínica</span>
            {renderSortIcon("clinicaNombre")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<PacienteRow>) => (
          <Typography noWrap>{params.row.clinicaNombre ?? "Sistema"}</Typography>
        ),
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
        renderCell: (params: GridRenderCellParams<PacienteRow>) => {
          const styles = statusColor(params.row.estado);

          return (
            <Chip
              label={styles.label}
              size="small"
              sx={{
                fontWeight: 700,
                color: styles.color,
                backgroundColor: styles.backgroundColor,
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
        renderCell: (params: GridRenderCellParams<PacienteRow>) => (
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
                <Tooltip title={params.row.estado === "activo" ? "Desactivar" : "Reactivar"}>
                  <IconButton size="small" onClick={() => askToggleStatus(params.row)}>
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
    [sortModel, theme.palette.mode, canEdit, canToggleStatus, selectMode, selectedIds, allVisibleSelected, someSelected]
  );

  const hasFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== "todos" ||
    clinicFilter !== "todas";

  return (
    <AdminLayout
      title="Pacientes"
      subtitle="Registro y seguimiento de infantes"
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
            Nuevo paciente
          </Button>
        ) : undefined
      }
    >
      <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: selectMode ? "info.main" : "divider", overflow: "hidden", transition: "border-color .2s" }}>
        {selectMode ? (
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "info.main", bgcolor: (t) => alpha(t.palette.info.main, t.palette.mode === "dark" ? 0.16 : 0.08), display: "flex", alignItems: "center", gap: 2 }}>
            <Typography sx={{ fontWeight: 700, color: "info.main", minWidth: 120 }}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<InfoOutlined fontSize="small" />}
                disabled={selectedIds.size !== 1}
                onClick={() => { const r = rows.find((row) => selectedIds.has(row.id)); if (r) openDetail(r.id); }}
                sx={{ textTransform: "none", borderRadius: 1.5 }}
              >Ver detalle</Button>
              {canEdit && (
                <Button size="small" variant="outlined" startIcon={<EditOutlined fontSize="small" />}
                  disabled={selectedIds.size !== 1}
                  onClick={() => { const r = rows.find((row) => selectedIds.has(row.id)); if (r) openEdit(r); }}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >Editar</Button>
              )}
              {canToggleStatus && (
                <Button size="small" variant="outlined" color="error"
                  startIcon={rows.find((r) => selectedIds.has(r.id))?.estado === "activo" ? <PauseCircleOutline fontSize="small" /> : <PlayCircleOutline fontSize="small" />}
                  disabled={selectedIds.size === 0}
                  onClick={() => void handleBulkToggleStatus()}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >{rows.find((r) => selectedIds.has(r.id))?.estado === "activo" ? "Dar de baja" : "Reactivar"}</Button>
              )}
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Cancelar selección"><IconButton onClick={toggleSelectMode} sx={{ width: 44, height: 44, border: "1px solid", borderColor: "info.main", borderRadius: 1.5, color: "info.main", bgcolor: (t) => alpha(t.palette.info.main, 0.1) }}><Close fontSize="small" /></IconButton></Tooltip>
          </Box>
        ) : (
          <Box sx={{
            px: 2, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "grid",
            gridTemplateColumns: isSuperAdmin ? { xs: "1fr", xl: "1fr 180px 220px 48px 48px" } : { xs: "1fr", xl: "1fr 180px 48px 48px" },
            gap: 1.5, alignItems: "center"
          }}
          >
            <TextField
              placeholder="Buscar por nombre o diagnóstico"
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
              onChange={(e) => setStatusFilter(e.target.value as "todos" | PacienteStatus)}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo</MenuItem>
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

            <Tooltip title="Seleccionar"><IconButton onClick={toggleSelectMode} sx={{ width: 44, height: 44, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}><CheckBoxOutlineBlank fontSize="small" /></IconButton></Tooltip>

            <Tooltip title="Configurar columnas">
              <IconButton onClick={() => setColumnsDialogOpen(true)} sx={{ width: 44, height: 44, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                <SettingsOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )} {/* end normal toolbar */}

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
                setSortModel([{ field: "nombre", sort: "asc" }]);
                return;
              }

              const next = model[0];

              if (!next || next.field === "rowActions") {
                setSortModel([{ field: "nombre", sort: "asc" }]);
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
            getRowClassName={(params) => selectMode && selectedIds.has(params.row.id) ? "row-selected" : ""}
            slots={{ noRowsOverlay: () => <EmptyState loading={loading} hasFilters={hasFilters} /> }}
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
                backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
              },
              "& .row-selected": {
                backgroundColor: `${alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.16 : 0.08)} !important`,
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

      <PacienteFormDialog
        open={dialogOpen}
        mode={dialogMode}
        defaultValues={
          dialogMode === "edit" && editingPaciente
            ? {
              nombre: editingPaciente.nombre,
              ap_paterno: editingPaciente.ap_paterno,
              ap_materno: editingPaciente.ap_materno ?? "",
              fecha_nacimiento: editingPaciente.fecha_nacimiento?.slice(0, 10) ?? "",
              sexo: (editingPaciente.sexo as "M" | "F") ?? "M",
              clinicaId: editingPaciente.clinicaId,
              estado: editingPaciente.estado,
              diagnostico_presuntivo: editingPaciente.diagnostico_presuntivo ?? "",
              antecedentes_relevantes: editingPaciente.antecedentes_relevantes ?? "",
              notas_generales: editingPaciente.notas_generales ?? "",
            }
            : { clinicaId: lockedClinicId }
        }
        clinics={clinics}
        submitting={formSubmitting}
        onClose={() => {
          if (formSubmitting) return;
          setDialogOpen(false);
          setEditingPaciente(null);
        }}
        onSave={handleSave}
      />

      <PacienteDetailPanel
        open={detailOpen}
        pacienteId={detailId}
        canManageTutores={canManageTutores}
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