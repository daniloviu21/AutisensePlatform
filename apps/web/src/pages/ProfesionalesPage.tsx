import {
  Add,
  ArrowDownward,
  ArrowUpward,
  CheckBoxOutlineBlank,
  EditOutlined,
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
import ProfessionalFormDialog, {
  type ClinicOption,
  type ProfessionalFormValues,
  type ProfessionalStatus,
} from "../components/profesionales/ProfessionalFormDialog";
import ConfirmProfessionalActionDialog from "../components/profesionales/ConfirmProfessionalActionDialog";
import AdminLayout from "../layout/AdminLayout";

type ProfessionalRow = ProfessionalFormValues & {
  id: number;
  clinicaNombre: string | null;
};

type ApiProfessional = {
  id: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  telefono: string | null;
  especialidad: string;
  organizacion: string | null;
  foto_url: string | null;
  foto_public_id: string | null;
  id_usuario: number;
  id_clinica: number;
  usuario: {
    id: number;
    correo: string;
    estado: ProfessionalStatus;
    must_change_password: boolean;
  } | null;
  clinica: {
    id: number;
    nombre: string;
    estado: string;
  } | null;
};

type ProfessionalsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiProfessional[];
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
  profesional: true,
  especialidad: true,
  organizacion: true,
  clinicaNombre: true,
  estado: true,
  rowActions: true,
};

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeProfessional(item: ApiProfessional): ProfessionalRow {
  return {
    id: item.id,
    correo: item.usuario?.correo ?? "",
    password: "",
    estado: item.usuario?.estado ?? "activo",
    clinicaId: item.id_clinica ?? null,
    clinicaNombre: item.clinica?.nombre ?? null,
    nombre: item.nombre ?? "",
    ap_paterno: item.ap_paterno ?? "",
    ap_materno: item.ap_materno ?? "",
    telefono: item.telefono ?? "",
    especialidad: item.especialidad ?? "",
    organizacion: item.organizacion ?? "",
    foto_url: item.foto_url ?? "",
    foto_public_id: item.foto_public_id ?? "",
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error as { message?: string })?.message;

  return typeof message === "string" && message.trim() ? message : fallback;
}

function compareValues(a: unknown, b: unknown) {
  const left = String(a ?? "").toLowerCase().trim();
  const right = String(b ?? "").toLowerCase().trim();
  return left.localeCompare(right, "es", { sensitivity: "base", numeric: true });
}

function statusColor(status: ProfessionalStatus) {
  if (status === "activo") {
    return {
      color: "#0F766E",
      backgroundColor: alpha("#2A9D8F", 0.14),
      label: "Activo",
    };
  }

  if (status === "pendiente") {
    return {
      color: "#9A3412",
      backgroundColor: alpha("#F59E0B", 0.18),
      label: "Pendiente",
    };
  }

  return {
    color: "#B91C1C",
    backgroundColor: alpha("#EF4444", 0.14),
    label: "Suspendido",
  };
}

function sortRows(rows: ProfessionalRow[], sortModel: GridSortModel) {
  if (!sortModel.length) return rows;

  const [{ field, sort }] = sortModel;
  if (!field || !sort) return rows;

  return [...rows].sort((a, b) => {
    if (field === "profesional") {
      const aName = collapseSpaces(`${a.nombre} ${a.ap_paterno} ${a.ap_materno}`);
      const bName = collapseSpaces(`${b.nombre} ${b.ap_paterno} ${b.ap_materno}`);
      const result = compareValues(aName, bName);
      return sort === "asc" ? result : -result;
    }

    const result = compareValues(
      a[field as keyof ProfessionalRow],
      b[field as keyof ProfessionalRow]
    );

    return sort === "asc" ? result : -result;
  });
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
        <Typography color="text.secondary">Cargando profesionales...</Typography>
      </Stack>
    );
  }

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1}
      sx={{ minHeight: 240, height: "100%", px: 2, textAlign: "center" }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 16 }}>
        No hay profesionales para mostrar
      </Typography>
      <Typography color="text.secondary">
        {hasFilters
          ? "Ajusta la búsqueda o los filtros para intentar de nuevo."
          : "Crea un nuevo profesional para comenzar."}
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
    { field: "profesional", label: "Profesional", required: true },
    { field: "especialidad", label: "Especialidad", required: false },
    { field: "organizacion", label: "Organización", required: false },
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

export default function ProfesionalesPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const canWrite = user?.role === "super_admin" || user?.role === "clinic_admin";
  const lockedClinicId = !isSuperAdmin ? (user?.clinicId ?? null) : null;

  const [rows, setRows] = useState<ProfessionalRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | ProfessionalStatus>("todos");
  const [clinicFilter, setClinicFilter] = useState<"todas" | number>(
    lockedClinicId ? lockedClinicId : "todas"
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingProfessional, setEditingProfessional] = useState<ProfessionalRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalRow | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(initialVisibilityModel);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "profesional", sort: "asc" },
  ]);

  const [loading, setLoading] = useState(false);

  // ── Multi-select ───────────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const toggleRowSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0 && !allVisibleSelected;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
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

  const showToast = useCallback((severity: ToastState["severity"], message: string) => {
    setToast({
      open: true,
      severity,
      message,
    });
  }, []);

  const loadClinics = useCallback(async () => {
    if (lockedClinicId) {
      return;
    }

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
  }, [lockedClinicId, showToast]);

  const loadProfessionals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await http.get<ProfessionalsListResponse>("/profesionales", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          q: debouncedSearch || undefined,
          estado: statusFilter === "todos" ? undefined : statusFilter,
          clinicaId: clinicFilter === "todas" ? undefined : clinicFilter,
        },
      });

      const mapped = (data.items ?? []).map(normalizeProfessional);
      const sorted = sortRows(mapped, sortModel);

      setRows(sorted);
      setTotalRows(data.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotalRows(0);
      showToast("error", getErrorMessage(error, "No se pudieron cargar los profesionales."));
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
    void loadProfessionals();
  }, [loadProfessionals]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingProfessional(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ProfessionalRow) => {
    setDialogMode("edit");
    setEditingProfessional({
      ...row,
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (
    values: ProfessionalFormValues,
    photoFile?: File | null
  ) => {
    try {
      setFormSubmitting(true);

      const formData = new FormData();
      formData.append("correo", values.correo);
      if (values.password) formData.append("password", values.password);
      formData.append("estado", values.estado);

      const effectiveClinicId = lockedClinicId ?? values.clinicaId;
      if (effectiveClinicId !== null) {
        formData.append("clinicaId", String(effectiveClinicId));
      }

      formData.append("nombre", values.nombre);
      formData.append("ap_paterno", values.ap_paterno);
      formData.append("ap_materno", values.ap_materno || "");
      formData.append("telefono", values.telefono);
      formData.append("especialidad", values.especialidad);
      formData.append("organizacion", values.organizacion);
      formData.append("foto_url", values.foto_url || "");
      formData.append("foto_public_id", values.foto_public_id || "");

      if (photoFile) {
        formData.append("foto", photoFile);
      }

    if (dialogMode === "create") {
    await http.post("/profesionales", formData);
    showToast("success", "El profesional se agregó correctamente.");
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    } else if (editingProfessional) {
    await http.put(`/profesionales/${editingProfessional.id}`, formData);
    showToast("success", "El profesional se actualizó correctamente.");
    }

      setDialogOpen(false);
      setEditingProfessional(null);
      await loadProfessionals();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo guardar el profesional."));
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: ProfessionalRow) => {
    setSelectedProfessional(row);
    setConfirmOpen(true);
  };

  // Bulk suspend/reactivate: opens confirm using first selected row as reference.
  const askBulkToggleStatus = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const firstRow = rows.find((r) => r.id === ids[0]);
    if (!firstRow) return;
    setSelectedProfessional(firstRow);
    setConfirmOpen(true);
  };
  const confirmToggleStatus = async () => {
    if (!selectedProfessional) return;

    const ids = selectedIds.size > 0 ? [...selectedIds] : [selectedProfessional.id];

    try {
      setStatusSubmitting(true);

      const nextState: ProfessionalStatus =
        selectedProfessional.estado === "activo" ? "suspendido" : "activo";

      await Promise.all(
        ids.map((id) =>
          http.patch(`/profesionales/${id}/status`, { estado: nextState })
        )
      );

      showToast(
        "success",
        ids.length === 1
          ? nextState === "suspendido"
            ? "El profesional fue suspendido correctamente."
            : "El profesional fue reactivado correctamente."
          : nextState === "suspendido"
          ? `${ids.length} profesionales suspendidos correctamente.`
          : `${ids.length} profesionales reactivados correctamente.`
      );

      setConfirmOpen(false);
      setSelectedProfessional(null);
      setSelectedIds(new Set());
      await loadProfessionals();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo actualizar el estado."));
    } finally {
      setStatusSubmitting(false);
    }
  };

  const toggleColumn = (field: string) => {
    if (field === "profesional") return;

    setColumnVisibilityModel((prev) => {
      const nextValue = !(prev[field] !== false);

      const nextModel = {
        ...prev,
        [field]: nextValue,
      };

      const protectedFields = [
        "profesional",
        "especialidad",
        "organizacion",
        "clinicaNombre",
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

  const columns = useMemo<GridColDef<ProfessionalRow>[]>(
    () => [
      // ── Checkbox column (only rendered in selectMode) ──────────────────
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
              renderHeader: () => (
                <Checkbox
                  size="small"
                  checked={allVisibleSelected}
                  indeterminate={someSelected}
                  onChange={toggleSelectAll}
                />
              ),
              renderCell: (params: GridRenderCellParams<ProfessionalRow>) => (
                <Checkbox
                  size="small"
                  checked={selectedIds.has(params.row.id)}
                  onChange={() => toggleRowSelection(params.row.id)}
                />
              ),
            } satisfies GridColDef<ProfessionalRow>,
          ]
        : []),
      {
        field: "profesional",
        headerName: "Profesional",
        flex: 1.25,
        minWidth: 290,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Profesional</span>
            {renderSortIcon("profesional")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<ProfessionalRow>) => {
          const fullName = collapseSpaces(
            `${params.row.nombre} ${params.row.ap_paterno} ${params.row.ap_materno}`
          );

          return (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                src={params.row.foto_url || undefined}
                sx={{
                  width: 34,
                  height: 34,
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

              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {params.row.correo}
                </Typography>
              </Box>
            </Stack>
          );
        },
      },
      {
        field: "especialidad",
        headerName: "Especialidad",
        flex: 0.95,
        minWidth: 180,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Especialidad</span>
            {renderSortIcon("especialidad")}
          </Stack>
        ),
      },
      {
        field: "organizacion",
        headerName: "Organización",
        flex: 1,
        minWidth: 180,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Organización</span>
            {renderSortIcon("organizacion")}
          </Stack>
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
        renderCell: (params: GridRenderCellParams<ProfessionalRow, string | null>) => (
          <Typography noWrap>{params.row.clinicaNombre ?? "—"}</Typography>
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
        renderCell: (params: GridRenderCellParams<ProfessionalRow, ProfessionalStatus>) => {
          const styles = statusColor(params.row.estado);

          return (
            <Alert
              icon={false}
              severity="success"
              sx={{
                py: 0,
                px: 1.2,
                minWidth: 0,
                borderRadius: 999,
                fontSize: 12,
                alignItems: "center",
                "& .MuiAlert-message": { p: 0, fontWeight: 700 },
                color: styles.color,
                backgroundColor: styles.backgroundColor,
              }}
            >
              {styles.label}
            </Alert>
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
        renderCell: (params: GridRenderCellParams<ProfessionalRow>) => (
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
              {canWrite && (
                <>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => openEdit(params.row)}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={params.row.estado === "activo" ? "Suspender" : "Reactivar"}>
                    <IconButton size="small" onClick={() => askToggleStatus(params.row)}>
                      {params.row.estado === "activo" ? (
                        <PauseCircleOutline fontSize="small" />
                      ) : (
                        <PlayCircleOutline fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Box>
        ),
      },
    ],
    [sortModel, theme.palette.mode, canWrite, selectMode, selectedIds, allVisibleSelected, someSelected]
  );

  const hasFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== "todos" ||
    clinicFilter !== "todas";

  return (
    <AdminLayout
      title="Profesionales"
      subtitle="Gestión de profesionales de la clínica"
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={selectMode ? "Cancelar selección" : "Selección múltiple"}>
            <IconButton
              onClick={toggleSelectMode}
              sx={{
                width: 40,
                height: 40,
                border: "1px solid",
                borderColor: selectMode ? "primary.main" : "divider",
                borderRadius: 1.5,
                color: selectMode ? "primary.main" : "inherit",
                bgcolor: selectMode ? "action.selected" : "transparent",
              }}
            >
              <CheckBoxOutlineBlank fontSize="small" />
            </IconButton>
          </Tooltip>
          {canWrite && !selectMode && (
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
              Nuevo profesional
            </Button>
          )}
        </Stack>
      }
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: selectMode ? "var(--color-border-info, #90CAF9)" : "divider",
          overflow: "hidden",
          transition: "border-color .2s",
        }}
      >
        {/* ── Selection toolbar (shown when selectMode is on) ── */}
        {selectMode ? (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid var(--color-border-info, #90CAF9)",
              backgroundColor: "var(--color-background-info, #E3F2FD)",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography sx={{ fontWeight: 700, color: "info.dark", minWidth: 120 }}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
            </Typography>

            <Stack direction="row" spacing={1}>
              {canWrite && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlined fontSize="small" />}
                    disabled={selectedIds.size !== 1}
                    onClick={() => {
                      const row = rows.find((r) => selectedIds.has(r.id));
                      if (row) openEdit(row);
                    }}
                    sx={{ textTransform: "none", borderRadius: 1.5 }}
                  >
                    Editar
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={
                      rows.find((r) => selectedIds.has(r.id))?.estado === "activo"
                        ? <PauseCircleOutline fontSize="small" />
                        : <PlayCircleOutline fontSize="small" />
                    }
                    disabled={selectedIds.size === 0}
                    onClick={askBulkToggleStatus}
                    sx={{ textTransform: "none", borderRadius: 1.5 }}
                  >
                    {rows.find((r) => selectedIds.has(r.id))?.estado === "activo"
                      ? "Dar de baja"
                      : "Reactivar"}
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        ) : (
          /* ── Normal filter toolbar ── */
          <Box
            sx={{
              px: 2,
              py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: lockedClinicId ? "1fr 180px 48px" : "1fr 180px 220px 48px",
              },
              gap: 1.5,
              alignItems: "center",
            }}
          >
          <TextField
            placeholder="Buscar por nombre, correo, especialidad u organización"
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
            onChange={(e) => setStatusFilter(e.target.value as "todos" | ProfessionalStatus)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="suspendido">Suspendido</MenuItem>
          </TextField>

          {!lockedClinicId && (
            <TextField
              select
              fullWidth
              label="Clínica"
              value={clinicFilter}
              onChange={(e) =>
                setClinicFilter(e.target.value === "todas" ? "todas" : Number(e.target.value))
              }
            >
              <MenuItem value="todas">Todas</MenuItem>
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
        )} {/* end of normal toolbar */}

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
                setSortModel([{ field: "profesional", sort: "asc" }]);
                return;
              }

              const next = model[0];

              if (!next || next.field === "rowActions") {
                setSortModel([{ field: "profesional", sort: "asc" }]);
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
            getRowClassName={(params) =>
              selectMode && selectedIds.has(params.row.id) ? "row-selected" : ""
            }
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
              "& .row-selected": {
                backgroundColor: "var(--color-background-info, #E3F2FD) !important",
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

      <ProfessionalFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={editingProfessional}
        existingProfessionals={rows}
        clinics={
          lockedClinicId
            ? [
                {
                  id: lockedClinicId,
                  nombre:
                    rows.find((row) => row.clinicaId === lockedClinicId)?.clinicaNombre ??
                    "Mi clínica",
                },
              ]
            : clinics
        }
        lockClinicId={lockedClinicId}
        submitting={formSubmitting}
        onClose={() => {
          if (formSubmitting) return;
          setDialogOpen(false);
          setEditingProfessional(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmProfessionalActionDialog
        open={confirmOpen}
        title={
          selectedProfessional?.estado === "activo"
            ? "Suspender profesional"
            : "Reactivar profesional"
        }
        description={
          selectedProfessional?.estado === "activo"
            ? "Esta acción impedirá temporalmente el acceso del profesional al sistema."
            : "El profesional volverá a tener acceso al sistema."
        }
        confirmText={selectedProfessional?.estado === "activo" ? "Suspender" : "Reactivar"}
        loading={statusSubmitting}
        onClose={() => {
          if (statusSubmitting) return;
          setConfirmOpen(false);
          setSelectedProfessional(null);
        }}
        onConfirm={confirmToggleStatus}
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