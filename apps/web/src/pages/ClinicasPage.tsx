import {
  Add,
  ArrowDownward,
  ArrowUpward,
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
import AdminLayout from "../layout/AdminLayout";
import ClinicFormDialog from "../components/clinicas/ClinicFormDialog";
import type {
  ClinicFormValues,
  ClinicStatus,
} from "../components/clinicas/ClinicFormDialog";
import ConfirmActionDialog from "../components/clinicas/ConfirmActionDialog";

type ClinicRow = ClinicFormValues & {
  id: number;
};

type ApiClinic = {
  id: number;
  nombre: string;
  razon_social: string | null;
  rfc: string | null;
  telefono: string | null;
  correo_contacto: string | null;
  direccion: string | null;
  estado: ClinicStatus;
  createdAt?: string;
  updatedAt?: string;
};

type ClinicsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiClinic[];
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
  razon_social: true,
  rfc: true,
  telefono: true,
  correo_contacto: true,
  estado: true,
  rowActions: true,
};

function normalizeClinic(apiClinic: ApiClinic): ClinicRow {
  return {
    id: apiClinic.id,
    nombre: apiClinic.nombre ?? "",
    razon_social: apiClinic.razon_social ?? "",
    rfc: apiClinic.rfc ?? "",
    telefono: apiClinic.telefono ?? "",
    correo_contacto: apiClinic.correo_contacto ?? "",
    direccion: apiClinic.direccion ?? "",
    estado: apiClinic.estado ?? "suspendida",
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
        <Typography color="text.secondary">Cargando clínicas...</Typography>
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
        No hay clínicas para mostrar
      </Typography>
      <Typography color="text.secondary">
        {hasFilters
          ? "Ajusta la búsqueda o los filtros para intentar de nuevo."
          : "Crea una nueva clínica para comenzar."}
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
    { field: "nombre", label: "Nombre", required: true },
    { field: "razon_social", label: "Razón social", required: false },
    { field: "rfc", label: "RFC", required: false },
    { field: "telefono", label: "Teléfono", required: false },
    { field: "correo_contacto", label: "Correo contacto", required: false },
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

export default function ClinicasPage() {
  const theme = useTheme();

  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | ClinicStatus>("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicRow | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

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
  }, [debouncedSearch, statusFilter]);

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
    try {
      setLoading(true);

      const activeSort = sortModel[0];
      const sortField =
        activeSort?.field && activeSort.field !== "rowActions"
          ? activeSort.field
          : "nombre";
      const sortDirection = activeSort?.sort ?? "asc";

      const { data } = await http.get<ClinicsListResponse>("/clinicas", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          q: debouncedSearch || undefined,
          estado: statusFilter === "todas" ? undefined : statusFilter,
          sortField,
          sortDirection,
        },
      });

      setRows((data.items ?? []).map(normalizeClinic));
      setTotalRows(data.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotalRows(0);
      showToast("error", getErrorMessage(error, "No se pudieron cargar las clínicas."));
    } finally {
      setLoading(false);
    }
  }, [
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

  const openCreate = () => {
    setDialogMode("create");
    setEditingClinic(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ClinicRow) => {
    setDialogMode("edit");
    setEditingClinic(row);
    setDialogOpen(true);
  };

  const handleSave = async (values: ClinicFormValues) => {
    try {
      setFormSubmitting(true);

      const payload = {
        nombre: values.nombre,
        razon_social: values.razon_social,
        rfc: values.rfc,
        telefono: values.telefono,
        correo_contacto: values.correo_contacto,
        direccion: values.direccion,
        estado: values.estado,
      };

      if (dialogMode === "create") {
        await http.post("/clinicas", payload);
        showToast("success", "La clínica se agregó correctamente.");
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      } else if (editingClinic) {
        await http.put(`/clinicas/${editingClinic.id}`, payload);
        showToast("success", "La clínica se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingClinic(null);
      await loadClinics();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo guardar la clínica."));
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: ClinicRow) => {
    setSelectedClinic(row);
    setConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedClinic) return;

    try {
      setStatusSubmitting(true);

      const nextState: ClinicStatus =
        selectedClinic.estado === "activa" ? "suspendida" : "activa";

      if (nextState === "suspendida") {
        await http.delete(`/clinicas/${selectedClinic.id}`);
      } else {
        await http.put(`/clinicas/${selectedClinic.id}`, {
          estado: "activa",
        });
      }

      showToast(
        "success",
        nextState === "suspendida"
          ? "La clínica fue suspendida correctamente."
          : "La clínica fue reactivada correctamente."
      );

      setConfirmOpen(false);
      setSelectedClinic(null);
      await loadClinics();
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, "No se pudo actualizar el estado de la clínica.")
      );
    } finally {
      setStatusSubmitting(false);
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

      const protectedFields = [
        "nombre",
        "razon_social",
        "rfc",
        "telefono",
        "correo_contacto",
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

  const columns = useMemo<GridColDef<ClinicRow>[]>(
    () => [
      {
        field: "nombre",
        headerName: "Nombre",
        flex: 1.1,
        minWidth: 240,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Nombre</span>
            {renderSortIcon("nombre")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<ClinicRow, string>) => (
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
              {params.row.nombre?.charAt(0)?.toUpperCase() ?? "C"}
            </Avatar>

            <Typography sx={{ fontWeight: 700 }} noWrap>
              {params.row.nombre}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "razon_social",
        headerName: "Razón social",
        flex: 1.35,
        minWidth: 260,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Razón social</span>
            {renderSortIcon("razon_social")}
          </Stack>
        ),
      },
      {
        field: "rfc",
        headerName: "RFC",
        flex: 0.7,
        minWidth: 150,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>RFC</span>
            {renderSortIcon("rfc")}
          </Stack>
        ),
      },
      {
        field: "telefono",
        headerName: "Teléfono",
        flex: 0.8,
        minWidth: 150,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Teléfono</span>
            {renderSortIcon("telefono")}
          </Stack>
        ),
      },
      {
        field: "correo_contacto",
        headerName: "Correo contacto",
        flex: 1.15,
        minWidth: 220,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Correo contacto</span>
            {renderSortIcon("correo_contacto")}
          </Stack>
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
        renderCell: (params: GridRenderCellParams<ClinicRow, ClinicStatus>) => {
          const active = params.row.estado === "activa";

          return (
            <Chip
              label={active ? "Activa" : "Suspendida"}
              size="small"
              sx={{
                fontWeight: 700,
                color: active ? "#0F766E" : "#B45309",
                backgroundColor: active
                  ? alpha("#2A9D8F", 0.14)
                  : alpha("#F59E0B", 0.18),
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
        renderCell: (params: GridRenderCellParams<ClinicRow>) => (
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
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(params.row)}>
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={params.row.estado === "activa" ? "Suspender" : "Reactivar"}>
                <IconButton size="small" onClick={() => askToggleStatus(params.row)}>
                  {params.row.estado === "activa" ? (
                    <PauseCircleOutline fontSize="small" />
                  ) : (
                    <PlayCircleOutline fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        ),
      },
    ],
    [sortModel, theme.palette.mode]
  );

  const hasFilters = Boolean(debouncedSearch) || statusFilter !== "todas";

  return (
    <AdminLayout
      title="Clínicas"
      subtitle="Gestión de clínicas registradas"
      actions={
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
          Nueva clínica
        </Button>
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
            gridTemplateColumns: { xs: "1fr", md: "1fr 180px 48px" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Buscar por nombre, razón social, RFC, correo o teléfono"
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
            onChange={(e) => setStatusFilter(e.target.value as "todas" | ClinicStatus)}
          >
            <MenuItem value="todas">Todas</MenuItem>
            <MenuItem value="activa">Activas</MenuItem>
            <MenuItem value="suspendida">Suspendidas</MenuItem>
          </TextField>

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

      <ClinicFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={editingClinic}
        existingClinics={rows}
        submitting={formSubmitting}
        onClose={() => {
          if (formSubmitting) return;
          setDialogOpen(false);
          setEditingClinic(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmActionDialog
        open={confirmOpen}
        title={
          selectedClinic?.estado === "activa"
            ? "Suspender clínica"
            : "Reactivar clínica"
        }
        description={
          selectedClinic?.estado === "activa"
            ? "Esta acción deshabilitará su operación administrativa hasta reactivarla."
            : "La clínica volverá a estar disponible para operación administrativa."
        }
        confirmText={selectedClinic?.estado === "activa" ? "Suspender" : "Reactivar"}
        onClose={() => {
          if (statusSubmitting) return;
          setConfirmOpen(false);
          setSelectedClinic(null);
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