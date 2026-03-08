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
import { useEffect, useMemo, useState } from "react";
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
  clinicaNombre: string | null;
};

type ToastState = {
  open: boolean;
  severity: "success" | "error" | "info" | "warning";
  message: string;
};

const clinicsMock: ClinicOption[] = [
  { id: 1, nombre: "Clínica San Ángel", estado: "activa" },
  { id: 2, nombre: "Centro Infantil Nova", estado: "activa" },
  { id: 3, nombre: "Unidad Pediátrica del Golfo", estado: "suspendida" },
  { id: 4, nombre: "Clínica Horizonte", estado: "activa" },
];

const initialUsers: UserRow[] = [
  {
    id: 1,
    correo: "admin@autisense.com",
    password: "",
    role: "super_admin",
    estado: "activo",
    clinicaId: null,
    clinicaNombre: null,
  },
  {
    id: 2,
    correo: "admin@sanangel.mx",
    password: "",
    role: "clinic_admin",
    estado: "activo",
    clinicaId: 1,
    clinicaNombre: "Clínica San Ángel",
  },
  {
    id: 3,
    correo: "terapia@sanangel.mx",
    password: "",
    role: "profesional",
    estado: "activo",
    clinicaId: 1,
    clinicaNombre: "Clínica San Ángel",
  },
  {
    id: 4,
    correo: "tutor1@nova.mx",
    password: "",
    role: "tutor",
    estado: "pendiente",
    clinicaId: 2,
    clinicaNombre: "Centro Infantil Nova",
  },
  {
    id: 5,
    correo: "admin@golfo.mx",
    password: "",
    role: "clinic_admin",
    estado: "suspendido",
    clinicaId: 3,
    clinicaNombre: "Unidad Pediátrica del Golfo",
  },
];

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

function EmptyState() {
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
        Ajusta el filtro o crea un nuevo usuario.
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
              const disableUncheck =
                column.required || (checked && visibleCount === 1);

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
                  label={
                    column.required
                      ? `${column.label}`
                      : column.label
                  }
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

function compareValues(a: unknown, b: unknown) {
  const left = String(a ?? "").toLowerCase().trim();
  const right = String(b ?? "").toLowerCase().trim();
  return left.localeCompare(right, "es", { sensitivity: "base", numeric: true });
}

function sortRows(rows: UserRow[], sortModel: GridSortModel) {
  if (!sortModel.length) return rows;

  const [{ field, sort }] = sortModel;
  if (!field || !sort) return rows;

  return [...rows].sort((a, b) => {
    const result = compareValues(a[field as keyof UserRow], b[field as keyof UserRow]);
    return sort === "asc" ? result : -result;
  });
}

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

export default function UsuariosPage() {
  const theme = useTheme();

  const [rows, setRows] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | UserRole>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | UserStatus>("todos");
  const [clinicFilter, setClinicFilter] = useState<"todas" | number>("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(initialVisibilityModel);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });

  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    severity: "success",
    message: "",
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.correo.toLowerCase().includes(q) ||
        roleLabel(row.role).toLowerCase().includes(q) ||
        (row.clinicaNombre ?? "").toLowerCase().includes(q);

      const matchesRole = roleFilter === "todos" ? true : row.role === roleFilter;
      const matchesStatus = statusFilter === "todos" ? true : row.estado === statusFilter;
      const matchesClinic =
        clinicFilter === "todas" ? true : row.clinicaId === clinicFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesClinic;
    });
  }, [rows, search, roleFilter, statusFilter, clinicFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortModel), [filteredRows, sortModel]);

  const totalRows = sortedRows.length;

  const paginatedRows = useMemo(() => {
    const start = paginationModel.page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return sortedRows.slice(start, end);
  }, [sortedRows, paginationModel.page]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, roleFilter, statusFilter, clinicFilter, sortModel]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalRows / PAGE_SIZE) - 1);

    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({
        ...prev,
        page: maxPage,
      }));
    }
  }, [totalRows, paginationModel.page]);

  const showToast = (severity: ToastState["severity"], message: string) => {
    setToast({
      open: true,
      severity,
      message,
    });
  };

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

      const clinicName =
        values.clinicaId == null
          ? null
          : clinicsMock.find((c) => c.id === values.clinicaId)?.nombre ?? null;

      if (dialogMode === "create") {
        const next: UserRow = {
          ...values,
          id: Date.now(),
          clinicaNombre: clinicName,
        };

        setRows((prev) => [next, ...prev]);
        showToast("success", "El usuario se agregó correctamente.");
      } else if (editingUser) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingUser.id
              ? {
                  ...row,
                  ...values,
                  id: editingUser.id,
                  clinicaNombre: clinicName,
                }
              : row
          )
        );
        showToast("success", "El usuario se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingUser(null);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    } catch {
      showToast("error", "No se pudo guardar el usuario.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: UserRow) => {
    setSelectedUser(row);
    setConfirmOpen(true);
  };

  const confirmToggleStatus = () => {
    if (!selectedUser) return;

    try {
      const nextState: UserStatus =
        selectedUser.estado === "activo" ? "suspendido" : "activo";

      setRows((prev) =>
        prev.map((row) =>
          row.id === selectedUser.id
            ? {
                ...row,
                estado: nextState,
              }
            : row
        )
      );

      showToast(
        "success",
        nextState === "suspendido"
          ? "El usuario fue suspendido correctamente."
          : "El usuario fue reactivado correctamente."
      );
    } catch {
      showToast("error", "No se pudo actualizar el estado del usuario.");
    } finally {
      setConfirmOpen(false);
      setSelectedUser(null);
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
        width: 126,
        minWidth: 126,
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
    [theme.palette.mode, sortModel]
  );

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
            {clinicsMock.map((clinic) => (
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
            rows={paginatedRows}
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
            onSortModelChange={setSortModel}
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
            slots={{
              noRowsOverlay: EmptyState,
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
        clinics={clinicsMock}
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
        title={
          selectedUser?.estado === "activo"
            ? "Suspender usuario"
            : "Reactivar usuario"
        }
        description={
          selectedUser?.estado === "activo"
            ? "Esta acción impedirá temporalmente el acceso del usuario al sistema."
            : "El usuario volverá a tener acceso al sistema."
        }
        confirmText={
          selectedUser?.estado === "activo" ? "Suspender" : "Reactivar"
        }
        onClose={() => {
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