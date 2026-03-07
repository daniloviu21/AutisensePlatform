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
  VisibilityOutlined,
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
import ClinicFormDialog from "../components/clinicas/ClinicFormDialog";
import type {
  ClinicFormValues,
  ClinicStatus,
} from "../components/clinicas/ClinicFormDialog";
import ConfirmActionDialog from "../components/clinicas/ConfirmActionDialog";

type ClinicRow = ClinicFormValues & {
  id: number;
};

type ToastState = {
  open: boolean;
  severity: "success" | "error" | "info" | "warning";
  message: string;
};

const initialClinics: ClinicRow[] = [
  {
    id: 1,
    nombre: "Clínica San Ángel",
    razon_social: "San Ángel Pediatría Integral S.A. de C.V.",
    rfc: "SPI240101AAA",
    telefono: "2291112233",
    correo_contacto: "contacto@sanangel.mx",
    direccion: "Av. Costa Verde 120, Fracc. Reforma, Veracruz, Ver.",
    estado: "activa",
  },
  {
    id: 2,
    nombre: "Centro Infantil Nova",
    razon_social: "Centro Infantil Nova S.C.",
    rfc: "CIN240101BBB",
    telefono: "2285550102",
    correo_contacto: "admin@novainfantil.mx",
    direccion: "Calle Magnolia 45, Zona Centro, Xalapa, Ver.",
    estado: "activa",
  },
  {
    id: 3,
    nombre: "Unidad Pediátrica del Golfo",
    razon_social: "Unidad Pediátrica del Golfo S.A.",
    rfc: "UPG240101CCC",
    telefono: "2293334455",
    correo_contacto: "recepcion@upg.mx",
    direccion: "Blvd. Hidalgo 250, Tampico, Tamps.",
    estado: "suspendida",
  },
  {
    id: 4,
    nombre: "Clínica Horizonte",
    razon_social: "Horizonte Infantil S.A. de C.V.",
    rfc: "CHI240101DDD",
    telefono: "9991112233",
    correo_contacto: "contacto@horizonte.mx",
    direccion: "Calle 60 220, Mérida, Yuc.",
    estado: "activa",
  },
  {
    id: 5,
    nombre: "Pediacare Norte",
    razon_social: "Pediacare Norte S.C.",
    rfc: "PNO240101EEE",
    telefono: "8185557788",
    correo_contacto: "admin@pediacare.mx",
    direccion: "Av. Real 501, Monterrey, N.L.",
    estado: "activa",
  },
  {
    id: 6,
    nombre: "Clínica Misión Azul",
    razon_social: "Misión Azul Pediatría S.A.",
    rfc: "MAP240101FFF",
    telefono: "6674441122",
    correo_contacto: "contacto@misionazul.mx",
    direccion: "Blvd. Universitarios 300, Culiacán, Sin.",
    estado: "suspendida",
  },
  {
    id: 7,
    nombre: "Centro Pediátrico del Valle",
    razon_social: "Centro Pediátrico del Valle S.C.",
    rfc: "CPV240101GGG",
    telefono: "3337772211",
    correo_contacto: "recepcion@cpvalle.mx",
    direccion: "Av. Vallarta 1800, Guadalajara, Jal.",
    estado: "activa",
  },
  {
    id: 8,
    nombre: "Unidad Infantil del Pacífico",
    razon_social: "Unidad Infantil del Pacífico S.A. de C.V.",
    rfc: "UIP240101HHH",
    telefono: "6123337788",
    correo_contacto: "admin@uipacifico.mx",
    direccion: "Malecón 22, La Paz, B.C.S.",
    estado: "suspendida",
  },
  {
    id: 9,
    nombre: "Clínica Arcoíris",
    razon_social: "Clínica Arcoíris Infantil S.C.",
    rfc: "CAI240101III",
    telefono: "2224568899",
    correo_contacto: "contacto@arcoiris.mx",
    direccion: "Av. Juárez 501, Puebla, Pue.",
    estado: "activa",
  },
  {
    id: 10,
    nombre: "Pediatría del Centro",
    razon_social: "Pediatría del Centro S.A.",
    rfc: "PDC240101JJJ",
    telefono: "4442223344",
    correo_contacto: "info@pediatriacentro.mx",
    direccion: "Carranza 120, San Luis Potosí, S.L.P.",
    estado: "activa",
  },
  {
    id: 11,
    nombre: "Clínica Bosque Salud",
    razon_social: "Bosque Salud Infantil S.C.",
    rfc: "BSI240101KKK",
    telefono: "7779872233",
    correo_contacto: "admin@bosquesalud.mx",
    direccion: "Av. Teopanzolco 33, Cuernavaca, Mor.",
    estado: "suspendida",
  },
  {
    id: 12,
    nombre: "Centro Integral Aurora",
    razon_social: "Centro Integral Aurora S.A. de C.V.",
    rfc: "CIA240101LLL",
    telefono: "6141117766",
    correo_contacto: "contacto@aurora.mx",
    direccion: "Av. Universidad 45, Chihuahua, Chih.",
    estado: "activa",
  },
];

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
        No hay clínicas para mostrar
      </Typography>
      <Typography color="text.secondary">
        Ajusta el filtro o crea una nueva clínica.
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
    { field: "nombre", label: "Nombre" },
    { field: "razon_social", label: "Razón social" },
    { field: "rfc", label: "RFC" },
    { field: "telefono", label: "Teléfono" },
    { field: "correo_contacto", label: "Correo contacto" },
    { field: "estado", label: "Estado" },
  ];

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
        <FormGroup>
          {columns.map((column) => (
            <FormControlLabel
              key={column.field}
              control={
                <Checkbox
                  checked={model[column.field] !== false}
                  onChange={() => onToggle(column.field)}
                />
              }
              label={column.label}
            />
          ))}
        </FormGroup>
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

function sortRows(rows: ClinicRow[], sortModel: GridSortModel) {
  if (!sortModel.length) return rows;

  const [{ field, sort }] = sortModel;
  if (!field || !sort) return rows;

  const sorted = [...rows].sort((a, b) => {
    const result = compareValues(a[field as keyof ClinicRow], b[field as keyof ClinicRow]);
    return sort === "asc" ? result : -result;
  });

  return sorted;
}

export default function ClinicasPage() {
  const theme = useTheme();

  const [rows, setRows] = useState<ClinicRow[]>(initialClinics);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | ClinicStatus>("todas");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicRow | null>(null);

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
        row.nombre.toLowerCase().includes(q) ||
        row.razon_social.toLowerCase().includes(q) ||
        row.rfc.toLowerCase().includes(q) ||
        row.correo_contacto.toLowerCase().includes(q) ||
        row.telefono.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "todas" ? true : row.estado === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortModel), [filteredRows, sortModel]);

  const totalRows = sortedRows.length;

  const paginatedRows = useMemo(() => {
    const start = paginationModel.page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return sortedRows.slice(start, end);
  }, [sortedRows, paginationModel.page]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [search, statusFilter, sortModel]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalRows / PAGE_SIZE) - 1);

    if (paginationModel.page > maxPage) {
      setPaginationModel((prev) => ({
        ...prev,
        page: maxPage,
      }));
    }
  }, [totalRows, paginationModel.page]);

  const showToast = (
    severity: ToastState["severity"],
    message: string
  ) => {
    setToast({
      open: true,
      severity,
      message,
    });
  };

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

      if (dialogMode === "create") {
        const next = { ...values, id: Date.now() };
        setRows((prev) => [next, ...prev]);
        showToast("success", "La clínica se agregó correctamente.");
      } else if (editingClinic) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === editingClinic.id
              ? { ...row, ...values, id: editingClinic.id }
              : row
          )
        );
        showToast("success", "La clínica se actualizó correctamente.");
      }

      setDialogOpen(false);
      setEditingClinic(null);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    } catch {
      showToast("error", "No se pudo guardar la clínica.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const askToggleStatus = (row: ClinicRow) => {
    setSelectedClinic(row);
    setConfirmOpen(true);
  };

  const confirmToggleStatus = () => {
    if (!selectedClinic) return;

    try {
      const nextState =
        selectedClinic.estado === "activa" ? "suspendida" : "activa";

      setRows((prev) =>
        prev.map((row) =>
          row.id === selectedClinic.id
            ? {
                ...row,
                estado: nextState,
              }
            : row
        )
      );

      showToast(
        "success",
        nextState === "suspendida"
          ? "La clínica fue suspendida correctamente."
          : "La clínica fue reactivada correctamente."
      );
    } catch {
      showToast("error", "No se pudo actualizar el estado de la clínica.");
    } finally {
      setConfirmOpen(false);
      setSelectedClinic(null);
    }
  };

  const toggleColumn = (field: string) => {
    setColumnVisibilityModel((prev) => ({
      ...prev,
      [field]: !(prev[field] !== false),
    }));
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
              <Tooltip title="Ver">
                <IconButton size="small">
                  <VisibilityOutlined fontSize="small" />
                </IconButton>
              </Tooltip>

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
    [theme.palette.mode, sortModel]
  );

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
        confirmText={
          selectedClinic?.estado === "activa" ? "Suspender" : "Reactivar"
        }
        onClose={() => {
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