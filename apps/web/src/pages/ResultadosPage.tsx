import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  CircularProgress,
  Stack,
  Alert,
  Chip,
  IconButton,
  Button,
  Autocomplete,
  TextField,
} from "@mui/material";
import { PersonOutline, ScienceOutlined, VisibilityOutlined } from "@mui/icons-material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import AdminLayout from "../layout/AdminLayout";
import { http } from "../api/http";

type PacienteOption = {
  id: number;
  nombre: string;
  ap_paterno: string;
};

type AnalisisHistorialInfo = {
  id: number;
  estado: string;
  score: number | null;
  clasificacion: string | null;
  confianza: number | null;
  createdAt: string;
  archivo: {
    nombre_archivo: string;
    encuentro?: {
      fecha: string;
      tipo_encuentro: string;
    } | null;
  };
};

export default function ResultadosPage() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | "">("");

  const [historial, setHistorial] = useState<AnalisisHistorialInfo[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOption] = useState<PacienteOption | null>(null);

  // Load patients on mount and when typing (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      async function fetchPacientes() {
        try {
          setLoadingPacientes(true);
          const res = await http.get("/pacientes", {
            params: { page: 1, pageSize: 50, estado: "activo", q: inputValue },
          });
          setPacientes(res.data.items || []);
        } catch (err) {
          console.error("Error loading pacientes:", err);
        } finally {
          setLoadingPacientes(false);
        }
      }
      fetchPacientes();
    }, 400);

    return () => clearTimeout(handler);
  }, [inputValue]);

  // Fetch history when patient changes
  useEffect(() => {
    async function fetchHistorial() {
      if (!selectedPacienteId) {
        setHistorial([]);
        return;
      }
      try {
        setLoadingHistorial(true);
        setErrorMsg(null);
        const res = await http.get(`/analisis?pacienteId=${selectedPacienteId}`);
        setHistorial(res.data || []);
      } catch (err) {
        console.error("Error loading historial:", err);
        setErrorMsg("Ocurrió un error al cargar el historial de análisis.");
      } finally {
        setLoadingHistorial(false);
      }
    }
    fetchHistorial();
  }, [selectedPacienteId]);

  const columns: GridColDef[] = [
    {
      field: "fecha",
      headerName: "Fecha Encuentro",
      width: 150,
      disableColumnMenu: true,
      valueGetter: (params, row: AnalisisHistorialInfo) => {
        const d = row.archivo?.encuentro?.fecha || row.createdAt;
        return new Date(d).toLocaleDateString();
      }
    },
    {
      field: "tipo",
      headerName: "Tipo",
      width: 160,
      disableColumnMenu: true,
      valueGetter: (params, row: AnalisisHistorialInfo) => row.archivo?.encuentro?.tipo_encuentro || "N/A"
    },
    {
      field: "archivo",
      headerName: "Archivo Analizado",
      flex: 1,
      minWidth: 200,
      disableColumnMenu: true,
      valueGetter: (params, row: AnalisisHistorialInfo) => row.archivo?.nombre_archivo || "N/A"
    },
    {
      field: "score",
      headerName: "Score",
      width: 100,
      disableColumnMenu: true,
      valueGetter: (params, row: AnalisisHistorialInfo) => row.score ? row.score.toFixed(2) : "-"
    },
    {
      field: "clasificacion",
      headerName: "Clasificación",
      width: 160,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<AnalisisHistorialInfo>) => {
        const val = params.row.clasificacion;
        if (!val) return "-";
        
        let color: "error" | "warning" | "success" | "default" = "default";
        if (val.toLowerCase().includes("alto")) color = "error";
        else if (val.toLowerCase().includes("moderado")) color = "warning";
        else if (val.toLowerCase().includes("bajo") || val.toLowerCase().includes("normal")) color = "success";
        
        return <Chip label={val} color={color} size="small" variant="outlined" />;
      }
    },
    {
      field: "confianza",
      headerName: "Confianza",
      width: 110,
      disableColumnMenu: true,
      valueGetter: (params, row: AnalisisHistorialInfo) => row.confianza ? `${(row.confianza * 100).toFixed(0)}%` : "-"
    },
    {
      field: "estado",
      headerName: "Estado",
      width: 120,
      disableColumnMenu: true,
      renderCell: (params) => {
        const isCompleted = params.row.estado === "completado";
        return (
          <Chip
            label={params.row.estado}
            color={isCompleted ? "success" : "default"}
            size="small"
          />
        );
      }
    },
    {
      field: "acciones",
      headerName: "",
      width: 80,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params: GridRenderCellParams<AnalisisHistorialInfo>) => (
        <IconButton
          size="small"
          color="primary"
          title="Ver detalle"
          onClick={() => navigate(`/resultados/${params.row.id}`)}
        >
          <VisibilityOutlined fontSize="small" />
        </IconButton>
      ),
    }
  ];

  return (
    <AdminLayout
      title="Resultados del Análisis"
      subtitle="Consulta el historial de evaluaciones procesadas por la IA."
    >
      <Box sx={{ maxWidth: "100%", mx: "auto", mt: 2 }}>

        {/* Selector de Paciente */}
        <Paper elevation={0} sx={{ px: 2, py: 1.5, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center" flex={1}>
              <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ minWidth: 150 }}>
                Filtrar por paciente:
              </Typography>

              <FormControl sx={{ flex: 1, maxWidth: 400 }} size="small">
                <Autocomplete<PacienteOption>
                  options={pacientes}
                  getOptionLabel={(option: PacienteOption) => `${option.nombre} ${option.ap_paterno}`}
                  value={selectedOption}
                  onChange={(_: any, newValue: PacienteOption | null) => {
                    setSelectedOption(newValue);
                    setSelectedPacienteId(newValue ? newValue.id : "");
                  }}
                  inputValue={inputValue}
                  onInputChange={(_: any, newInputValue: string) => {
                    setInputValue(newInputValue);
                  }}
                  loading={loadingPacientes}
                  noOptionsText="No se encontraron pacientes"
                  filterOptions={(x: PacienteOption[]) => x} // Disable local filtering
                  isOptionEqualToValue={(option: PacienteOption, val: PacienteOption) => option.id === val.id}
                  renderInput={(params: any) => (
                    <TextField
                      {...params}
                      label="Buscar paciente..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <PersonOutline sx={{ ml: 1, mr: 0.5, color: "text.secondary", fontSize: 20 }} />
                            {params.InputProps.startAdornment}
                          </>
                        ),
                        endAdornment: (
                          <>
                            {loadingPacientes ? <CircularProgress color="inherit" size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </FormControl>
            </Stack>

            {selectedPacienteId && !loadingHistorial && (
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Se encontraron {historial.length} análisis para este paciente
              </Typography>
            )}
          </Stack>
        </Paper>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Historial o Estado Vacío */}
        {!selectedPacienteId ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              border: "2px dashed",
              borderColor: "divider",
              bgcolor: "background.default",
              borderRadius: 2,
            }}
          >
            <ScienceOutlined sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" fontWeight="bold" color="text.secondary">
              Selecciona un paciente para ver sus resultados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              El historial mostrará los resultados detectados en los videos subidos a su expediente.
            </Typography>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <DataGrid
              rows={historial}
              columns={columns}
              getRowId={(row) => row.id}
              loading={loadingHistorial}
              autoHeight
              disableRowSelectionOnClick
              disableColumnFilter
              disableColumnMenu
              disableColumnSelector
              disableDensitySelector
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "background.default",
                },
                "& .MuiDataGrid-cell": {
                  fontSize: 14,
                },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select, & .MuiTablePagination-selectIcon": {
                  display: "none",
                },
              }}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
              }}
              pageSizeOptions={[10]}
              slotProps={{
                pagination: {
                  labelDisplayedRows: ({ from, to, count }: any) => 
                    `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
                  labelRowsPerPage: "",
                }
              }}
            />
          </Paper>
        )}
      </Box>
    </AdminLayout>
  );
}
