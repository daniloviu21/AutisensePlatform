import {
  Add,
  ArrowDownward,
  ArrowUpward,
  EditOutlined,
  PauseCircleOutline,
  PlayCircleOutline,
  Search,
  SecurityOutlined,
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
import UserFormDialog from "../components/usuarios/UserFormDialog";
import type {
  ClinicOption,
  UserFormValues,
  UserRole,
  UserStatus,
} from "../components/usuarios/UserFormDialog";
import ConfirmUserActionDialog from "../components/usuarios/ConfirmUserActionDialog";

type UserRow = UserFormValues & {
  id: number;
  mfaEnabled: boolean;
  clinicaNombre: string | null;
};

type ApiUser = {
  id: number;
  correo: string;
  estado: UserStatus;
  mfaEnabled: boolean;
  id_clinica: number | null;
  id_rol: number;
  rol: {
    id: number;
    rol: UserRole;
    descripcion: string | null;
  } | null;
  clinica: {
    id: number;
    nombre: string;
    estado: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type UsersListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ApiUser[];
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
  correo: true,
  role: true,
  clinicaNombre: true,
  estado: true,
  rowActions: true,
};

function roleLabel(role: UserRole) {
  switch (role) {
    case "super_admin":
      return "Super admin";
    case "clinic_admin":
      return "Admin de clínica";
    case "profesional":
      return "Profesional";
    case "tutor":
      return "Tutor";
    default:
      return role;
  }
}

function statusColor(status: UserStatus) {
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

function normalizeUser(apiUser: ApiUser): UserRow {
  return {
    id: apiUser.id,
    correo: apiUser.correo ?? "",
    password: "",
    role: apiUser.rol?.rol ?? "clinic_admin",
    estado: apiUser.estado ?? "activo",
    mfaEnabled: apiUser.mfaEnabled ?? false,
    clinicaId: apiUser.id_clinica ?? null,
    clinicaNombre: apiUser.clinica?.nombre ?? null,
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
        <Typography color="text.secondary">Cargando usuarios...</Typography>
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
        No hay usuarios para mostrar
      </Typography>
      <Typography color="text.secondary">
        {hasFilters
          ? "Ajusta la búsqueda o los filtros para intentar de nuevo."
          : "Crea un nuevo usuario para comenzar."}
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
    { field: "correo", label: "Correo", required: true },
    { field: "role", label: "Rol", required: false },
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

export default function UsuariosPage() {
  const theme = useTheme();

  const [rows, setRows] = useState<UserRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | UserRole>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | UserStatus>("todos");
  const [clinicFilter, setClinicFilter] = useState<"todas" | number>("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(initialVisibilityModel);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "correo", sort: "asc" },
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
  }, [debouncedSearch, roleFilter, statusFilter, clinicFilter]);

  const showToast = useCallback((severity: ToastState["severity"], message: string) => {
    setToast({
      open: true,
      severity,
      message,
    });
  }, []);

  const loadClinics = useCallback(async () => {
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
  }, [showToast]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await http.get<UsersListResponse>("/usuarios", {
        params: {
          page: paginationModel.page + 1,
          pageSize: paginationModel.pageSize,
          q: debouncedSearch || undefined,
          role: roleFilter === "todos" ? undefined : roleFilter,
          estado: statusFilter === "todos" ? undefined : statusFilter,
          clinicaId: clinicFilter === "todas" ? undefined : clinicFilter,
        },
      });

      let mapped = (data.items ?? []).map(normalizeUser);

      const activeSort = sortModel[0];
      if (activeSort?.field && activeSort.sort) {
        const field = activeSort.field as keyof UserRow;
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
      showToast("error", getErrorMessage(error, "No se pudieron cargar los usuarios."));
    } finally {
      setLoading(false);
    }
  }, [
    clinicFilter,
    debouncedSearch,
    paginationModel.page,
    paginationModel.pageSize,
    roleFilter,
    showToast,
    sortModel,
    statusFilter,
  ]);

  useEffect(() => {
    void loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setDialogMode("edit");
    setEditingUser({
      ...row,
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (values: UserFormValues) => {
    try {
      setFormSubmitting(true);

      const payload = {
        correo: values.correo,
        password: values.password,
        role: values.role,
        estado: values.estado,
        clinicaId: values.role === "super_admin" ? null : values.clinicaId,
      };

      if (dialogMode === "create") {
        await http.post("/usuarios", payload);
        showToast("success", "El usuario se agregó correctamente.");
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      } else if (editingUser) {
        await http.put(`/usuarios/${editingUser.id}`, payload);
        showToast("success", "El usuario se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      showToast("error", getErrorMessage(error, "No se pudo guardar el usuario."));
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: UserRow) => {
    setSelectedUser(row);
    setConfirmOpen(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedUser) return;

    try {
      setStatusSubmitting(true);

      const nextState: UserStatus =
        selectedUser.estado === "activo" ? "suspendido" : "activo";

      await http.patch(`/usuarios/${selectedUser.id}/status`, {
        estado: nextState,
      });

      showToast(
        "success",
        nextState === "suspendido"
          ? "El usuario fue suspendido correctamente."
          : "El usuario fue reactivado correctamente."
      );

      setConfirmOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      showToast(
        "error",
        getErrorMessage(error, "No se pudo actualizar el estado del usuario.")
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const toggleMfa = async (row: UserRow) => {
    const next = !row.mfaEnabled;
    // Actualización optimista en UI
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, mfaEnabled: next } : r))
    );
    try {
      await http.patch(`/usuarios/${row.id}/mfa`, { enabled: next });
      showToast(
        "success",
        next ? "MFA activado correctamente." : "MFA desactivado correctamente."
      );
    } catch (error) {
      // Revierte en caso de error
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, mfaEnabled: !next } : r))
      );
      showToast("error", getErrorMessage(error, "No se pudo cambiar el estado de MFA."));
    }
  };

  const toggleColumn = (field: string) => {
    if (field === "correo") return;

    setColumnVisibilityModel((prev) => {
      const nextValue = !(prev[field] !== false);

      const nextModel = {
        ...prev,
        [field]: nextValue,
      };

      const protectedFields = ["correo", "role", "clinicaNombre", "estado"];
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

  const columns = useMemo<GridColDef<UserRow>[]>(
    () => [
      {
        field: "correo",
        headerName: "Correo",
        flex: 1.35,
        minWidth: 260,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Correo</span>
            {renderSortIcon("correo")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<UserRow, string>) => (
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
              {params.row.correo?.charAt(0)?.toUpperCase() ?? "U"}
            </Avatar>

            <Typography sx={{ fontWeight: 700 }} noWrap>
              {params.row.correo}
            </Typography>
          </Stack>
        ),
      },
      {
        field: "role",
        headerName: "Rol",
        flex: 0.95,
        minWidth: 180,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Rol</span>
            {renderSortIcon("role")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<UserRow, UserRole>) => (
          <Typography noWrap>{roleLabel(params.row.role)}</Typography>
        ),
      },
      {
        field: "clinicaNombre",
        headerName: "Clínica",
        flex: 1.1,
        minWidth: 220,
        sortable: true,
        disableColumnMenu: true,
        renderHeader: () => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Clínica</span>
            {renderSortIcon("clinicaNombre")}
          </Stack>
        ),
        renderCell: (params: GridRenderCellParams<UserRow, string | null>) => (
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
        renderCell: (params: GridRenderCellParams<UserRow, UserStatus>) => {
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
        width: 156,
        minWidth: 156,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<UserRow>) => (
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

              <Tooltip title={params.row.mfaEnabled ? "Desactivar MFA" : "Activar MFA"}>
                <IconButton
                  size="small"
                  onClick={() => toggleMfa(params.row)}
                  sx={{ color: params.row.mfaEnabled ? "primary.main" : "action.disabled" }}
                >
                  <SecurityOutlined fontSize="small" />
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
            </Stack>
          </Box>
        ),
      },
    ],
    [sortModel, theme.palette.mode]
  );

  const hasFilters =
    Boolean(debouncedSearch) ||
    roleFilter !== "todos" ||
    statusFilter !== "todos" ||
    clinicFilter !== "todas";

  return (
    <AdminLayout
      title="Usuarios"
      subtitle="Gestión de cuentas de acceso del sistema"
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
          Nuevo usuario
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
            gridTemplateColumns: { xs: "1fr", xl: "1fr 180px 180px 220px 48px" },
            gap: 1.5,
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Buscar por correo, rol o clínica"
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
            label="Rol"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "todos" | UserRole)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="super_admin">Super admin</MenuItem>
            <MenuItem value="clinic_admin">Admin de clínica</MenuItem>
            <MenuItem value="profesional">Profesional</MenuItem>
            <MenuItem value="tutor">Tutor</MenuItem>
          </TextField>

          <TextField
            select
            fullWidth
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "todos" | UserStatus)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="pendiente">Pendiente</MenuItem>
            <MenuItem value="suspendido">Suspendido</MenuItem>
          </TextField>

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
                setSortModel([{ field: "correo", sort: "asc" }]);
                return;
              }

              const next = model[0];

              if (!next || next.field === "rowActions") {
                setSortModel([{ field: "correo", sort: "asc" }]);
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

      <UserFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initialData={editingUser}
        existingUsers={rows}
        clinics={clinics}
        submitting={formSubmitting}
        onClose={() => {
          if (formSubmitting) return;
          setDialogOpen(false);
          setEditingUser(null);
        }}
        onSubmit={handleSave}
      />

      <ConfirmUserActionDialog
        open={confirmOpen}
        title={selectedUser?.estado === "activo" ? "Suspender usuario" : "Reactivar usuario"}
        description={
          selectedUser?.estado === "activo"
            ? "Esta acción impedirá temporalmente el acceso del usuario al sistema."
            : "El usuario volverá a tener acceso al sistema."
        }
        confirmText={selectedUser?.estado === "activo" ? "Suspender" : "Reactivar"}
        loading={statusSubmitting}
        onClose={() => {
          if (statusSubmitting) return;
          setConfirmOpen(false);
          setSelectedUser(null);
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