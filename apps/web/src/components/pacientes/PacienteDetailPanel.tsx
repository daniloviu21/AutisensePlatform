import {
  Add,
  AssessmentOutlined,
  ChildCareOutlined,
  Delete,
  FolderOpenOutlined,
  GroupOutlined,
  MedicalServicesOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import {
  alpha,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { http } from "../../api/http";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TutorLink = {
  id: number;
  id_usuario: number;
  correo: string;
  nombre?: string;
  ap_paterno?: string;
  ap_materno?: string | null;
  nombreCompleto?: string;
  estadoUsuario: string;
  parentesco: string;
  es_principal: boolean;
  createdAt: string;
};

export type PacienteDetail = {
  id: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  fecha_nacimiento: string;
  sexo: string;
  escolaridad: string | null;
  diagnostico_presuntivo: string | null;
  antecedentes_relevantes: string | null;
  notas_generales: string | null;
  estado: string;
  clinicaNombre: string | null;
  id_clinica: number;
  tutores: TutorLink[];
};

type Props = {
  open: boolean;
  pacienteId: number | null;
  canManageTutores: boolean;
  onClose: () => void;
};

// Tipo para opciones del Autocomplete
type TutorOption = {
  id: number;       // id del Tutor (perfil)
  usuarioId: number;
  correo: string;
  nombreCompleto: string;
  telefono: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEXO_LABEL: Record<string, string> = { M: "Masculino", F: "Femenino", Otro: "Otro" };

const PARENTESCO_OPTIONS = [
  "Madre",
  "Padre",
  "Tutor legal",
  "Abuela",
  "Abuelo",
  "Tía",
  "Tío",
  "Hermana mayor",
  "Hermano mayor",
  "Otro familiar",
  "Otro",
];

function calcEdad(fechaNac: string): string {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let años = hoy.getFullYear() - nac.getFullYear();
  const mDiff = hoy.getMonth() - nac.getMonth();
  if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nac.getDate())) años--;
  const mesesRest = ((hoy.getMonth() - nac.getMonth()) + 12) % 12;
  return años < 2 ? `${años} año(s), ${mesesRest} mes(es)` : `${años} años`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-componentes de UI ────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {children}
    </Paper>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <Box sx={{ color: "primary.main", display: "flex", alignItems: "center", fontSize: 18 }}>
        {icon}
      </Box>
      <Typography
        variant="body2"
        fontWeight={700}
        letterSpacing="0.04em"
        textTransform="uppercase"
        color="text.secondary"
        fontSize={11}
      >
        {title}
      </Typography>
    </Stack>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.disabled"
        fontWeight={600}
        letterSpacing="0.05em"
        textTransform="uppercase"
        display="block"
        gutterBottom
      >
        {label}
      </Typography>
      {value ? (
        <Typography variant="body2" lineHeight={1.7}>{value}</Typography>
      ) : (
        <Typography variant="body2" color="text.disabled" fontStyle="italic">Sin registro</Typography>
      )}
    </Box>
  );
}

function SectionPlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <SectionCard>
      <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha("#2A9D8F", 0.1),
            color: "primary.main",
            fontSize: 24,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography fontWeight={700} variant="body1" gutterBottom>{title}</Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={340}>{description}</Typography>
        </Box>
        <Chip
          label="Próximamente"
          size="small"
          sx={{ fontWeight: 600, bgcolor: alpha("#2A9D8F", 0.1), color: "primary.main" }}
        />
      </Stack>
    </SectionCard>
  );
}

function a11yProps(index: number) {
  return { id: `detail-tab-${index}`, "aria-controls": `detail-tabpanel-${index}` };
}

// ─── Hook: búsqueda async de tutores ─────────────────────────────────────────

function useTutorSearch(enabled: boolean) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TutorOption[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setOptions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await http.get<{ items: TutorOption[] }>("/tutores", {
          params: { q: query.trim(), pageSize: 20, page: 1 },
        });
        setOptions(data.items ?? []);
      } catch {
        setOptions([]);
      } finally {
        setSearching(false);
      }
    }, 320);
  }, [query, enabled]);

  return { query, setQuery, options, searching };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PacienteDetailPanel({
  open,
  pacienteId,
  canManageTutores,
  onClose,
}: Props) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<PacienteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario de vincular tutor
  const [showAddTutor, setShowAddTutor] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<TutorOption | null>(null);
  const [tutorParentesco, setTutorParentesco] = useState("");
  const [tutorEsPrincipal, setTutorEsPrincipal] = useState(false);
  const [tutorSubmitting, setTutorSubmitting] = useState(false);
  const [tutorError, setTutorError] = useState<string | null>(null);

  const { query, setQuery, options, searching } = useTutorSearch(showAddTutor && canManageTutores);

  // IDs de tutores ya vinculados para filtrarlos del Autocomplete
  const linkedUserIds = new Set((data?.tutores ?? []).map((t) => t.id_usuario));

  const filteredOptions = options.filter((o) => !linkedUserIds.has(o.usuarioId));

  // Cargar datos del paciente
  useEffect(() => {
    if (!open || !pacienteId) return;
    setTab(0);
    setData(null);
    setError(null);
    setShowAddTutor(false);
    setLoading(true);

    http
      .get<PacienteDetail>(`/pacientes/${pacienteId}`)
      .then((r) => setData(r.data))
      .catch(() => setError("No se pudo cargar la información del paciente."))
      .finally(() => setLoading(false));
  }, [open, pacienteId]);

  const resetTutorForm = () => {
    setShowAddTutor(false);
    setSelectedTutor(null);
    setQuery("");
    setTutorParentesco("");
    setTutorEsPrincipal(false);
    setTutorError(null);
  };

  const handleAddTutor = async () => {
    if (!pacienteId || !selectedTutor || !tutorParentesco.trim()) return;
    setTutorSubmitting(true);
    setTutorError(null);
    try {
      const res = await http.post<TutorLink>(`/pacientes/${pacienteId}/tutores`, {
        userId: selectedTutor.usuarioId,
        parentesco: tutorParentesco.trim(),
        esPrincipal: tutorEsPrincipal,
      });
      setData((prev) => {
        if (!prev) return prev;
        const updatedTutores = tutorEsPrincipal
          ? prev.tutores.map((t) => ({ ...t, es_principal: false }))
          : [...prev.tutores];
        return { ...prev, tutores: [...updatedTutores, res.data] };
      });
      resetTutorForm();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTutorError(msg ?? "No se pudo vincular el tutor.");
    } finally {
      setTutorSubmitting(false);
    }
  };

  const handleRemoveTutor = async (tutorId: number) => {
    if (!pacienteId) return;
    try {
      await http.delete(`/pacientes/${pacienteId}/tutores/${tutorId}`);
      setData((prev) =>
        prev ? { ...prev, tutores: prev.tutores.filter((t) => t.id !== tutorId) } : prev
      );
    } catch {
      // Fallo silencioso — el ítem permanece en la lista
    }
  };

  const fullName = data
    ? `${data.nombre} ${data.ap_paterno}${data.ap_materno ? " " + data.ap_materno : ""}`
    : "Detalle de paciente";

  const canlink = canManageTutores && showAddTutor;
  const isLinkReady = !!selectedTutor && !!tutorParentesco.trim();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, minHeight: 560 } }}
    >
      {/* Encabezado */}
      <DialogTitle sx={{ pb: 0, pt: 3 }}>
        {data ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 15,
                flexShrink: 0,
                bgcolor: alpha("#2A9D8F", 0.12),
                color: "primary.main",
              }}
            >
              {data.nombre.charAt(0).toUpperCase()}
              {data.ap_paterno.charAt(0).toUpperCase()}
            </Box>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                  {fullName}
                </Typography>
                <Chip
                  label={data.estado === "activo" ? "Activo" : "Inactivo"}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    color: data.estado === "activo" ? "#0F766E" : "#B91C1C",
                    bgcolor:
                      data.estado === "activo"
                        ? alpha("#2A9D8F", 0.14)
                        : alpha("#EF4444", 0.14),
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {data.clinicaNombre ?? "Sin clínica"} · {calcEdad(data.fecha_nacimiento)}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Typography variant="h6" fontWeight={800}>{fullName}</Typography>
        )}
      </DialogTitle>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 3,
          mt: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiTab-root": {
            fontWeight: 600,
            textTransform: "none",
            fontSize: 13,
            minHeight: 44,
          },
        }}
      >
        <Tab icon={<ChildCareOutlined fontSize="small" />} iconPosition="start" label="Personal" {...a11yProps(0)} />
        <Tab icon={<MedicalServicesOutlined fontSize="small" />} iconPosition="start" label="Clínico" {...a11yProps(1)} />
        <Tab
          icon={<GroupOutlined fontSize="small" />}
          iconPosition="start"
          label={`Tutores${data ? ` (${data.tutores.length})` : ""}`}
          {...a11yProps(2)}
        />
        <Tab icon={<AssessmentOutlined fontSize="small" />} iconPosition="start" label="Evaluaciones" {...a11yProps(3)} />
        <Tab icon={<FolderOpenOutlined fontSize="small" />} iconPosition="start" label="Reportes" {...a11yProps(4)} />
      </Tabs>

      <DialogContent sx={{ pt: 3 }}>
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
            <CircularProgress size={36} />
            <Typography color="text.secondary" sx={{ mt: 2 }}>Cargando expediente...</Typography>
          </Stack>
        )}

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        {!loading && !error && data && (
          <>
            {/* ── Tab 0: Datos personales ───────────────────────────────── */}
            <Box hidden={tab !== 0}>
              <Stack spacing={2}>
                <SectionCard>
                  <SectionTitle icon={<ChildCareOutlined fontSize="inherit" />} title="Identificación" />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.5 }}>
                    <Field label="Nombre completo" value={fullName} />
                    <Field label="Fecha de nacimiento" value={formatDate(data.fecha_nacimiento)} />
                    <Field label="Edad" value={calcEdad(data.fecha_nacimiento)} />
                  </Box>
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<MedicalServicesOutlined fontSize="inherit" />} title="Datos demográficos" />
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.5 }}>
                    <Field label="Sexo" value={SEXO_LABEL[data.sexo] ?? data.sexo} />
                    <Field label="Escolaridad" value={data.escolaridad} />
                    <Field label="Clínica" value={data.clinicaNombre} />
                  </Box>
                </SectionCard>
              </Stack>
            </Box>

            {/* ── Tab 1: Datos clínicos ───────────────────────────────────── */}
            <Box hidden={tab !== 1}>
              <Stack spacing={2}>
                <SectionCard>
                  <SectionTitle icon={<MedicalServicesOutlined fontSize="inherit" />} title="Diagnóstico" />
                  <Field label="Diagnóstico presuntivo" value={data.diagnostico_presuntivo} />
                </SectionCard>

                <SectionCard>
                  <SectionTitle icon={<MedicalServicesOutlined fontSize="inherit" />} title="Historial" />
                  <Stack spacing={2.5}>
                    <Field label="Antecedentes relevantes" value={data.antecedentes_relevantes} />
                    <Divider />
                    <Field label="Notas generales" value={data.notas_generales} />
                  </Stack>
                </SectionCard>
              </Stack>
            </Box>

            {/* ── Tab 2: Tutores ─────────────────────────────────────────── */}
            <Box hidden={tab !== 2}>
              <Stack spacing={2}>
                {/* Lista de tutores vinculados */}
                {data.tutores.length === 0 && !showAddTutor && (
                  <SectionCard>
                    <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                      <GroupOutlined sx={{ fontSize: 36, color: "text.disabled" }} />
                      <Typography fontWeight={600} color="text.secondary">
                        Sin tutores vinculados
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Vincula tutores para habilitar la comunicación con la familia.
                      </Typography>
                    </Stack>
                  </SectionCard>
                )}

                {data.tutores.map((t) => {
                  const initials = t.nombreCompleto
                    ? t.nombreCompleto.charAt(0).toUpperCase()
                    : t.correo.charAt(0).toUpperCase();
                  const displayName = t.nombreCompleto || t.correo;

                  return (
                    <Paper
                      key={t.id}
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: t.es_principal ? "primary.main" : "divider",
                        bgcolor: t.es_principal ? alpha("#2A9D8F", 0.04) : "background.paper",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 13,
                            bgcolor: alpha("#2A9D8F", 0.12),
                            color: "primary.main",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </Box>
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={700} variant="body2" noWrap>
                              {displayName}
                            </Typography>
                            {t.es_principal && (
                              <Chip
                                label="Contacto principal"
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 700, height: 20, fontSize: 11 }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {t.parentesco} · {t.correo}
                          </Typography>
                        </Box>
                        {canManageTutores && (
                          <Tooltip title="Desvincular tutor">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveTutor(t.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}

                {/* Formulario de vinculación con Autocomplete */}
                {canlink && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: "1.5px dashed",
                      borderColor: "primary.main",
                      bgcolor: alpha("#2A9D8F", 0.03),
                    }}
                  >
                    <Typography fontWeight={700} variant="body2" sx={{ mb: 2 }}>
                      Vincular tutor
                    </Typography>

                    {tutorError && (
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {tutorError}
                      </Alert>
                    )}

                    <Stack spacing={1.5}>
                      {/* Autocomplete con búsqueda async */}
                      <Autocomplete<TutorOption>
                        options={filteredOptions}
                        loading={searching}
                        value={selectedTutor}
                        onChange={(_, newValue) => setSelectedTutor(newValue)}
                        inputValue={query}
                        onInputChange={(_, value) => setQuery(value)}
                        getOptionLabel={(opt) =>
                          opt.nombreCompleto
                            ? `${opt.nombreCompleto} — ${opt.correo}`
                            : opt.correo
                        }
                        isOptionEqualToValue={(opt, val) => opt.usuarioId === val.usuarioId}
                        noOptionsText={
                          query.trim()
                            ? searching
                              ? "Buscando..."
                              : "Sin resultados para esa búsqueda"
                            : "Escribe nombre, correo o teléfono para buscar"
                        }
                        filterOptions={(x) => x} // búsqueda la hace el backend
                        renderOption={(props, opt) => (
                          <Box component="li" {...props} key={opt.usuarioId}>
                            <Stack>
                              <Typography variant="body2" fontWeight={700}>
                                {opt.nombreCompleto || opt.correo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {opt.correo}
                                {opt.telefono ? ` · ${opt.telefono}` : ""}
                              </Typography>
                            </Stack>
                          </Box>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar tutor"
                            required
                            size="small"
                            placeholder="Nombre, correo o teléfono..."
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <SearchOutlined
                                    fontSize="small"
                                    sx={{ color: "text.secondary", mr: 0.5 }}
                                  />
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                              endAdornment: (
                                <>
                                  {searching ? <CircularProgress size={16} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />

                      {/* Parentesco del vínculo */}
                      <TextField
                        select
                        label="Parentesco con el paciente"
                        required
                        size="small"
                        value={tutorParentesco}
                        onChange={(e) => setTutorParentesco(e.target.value)}
                        fullWidth
                      >
                        <MenuItem value="" disabled>Selecciona parentesco</MenuItem>
                        {PARENTESCO_OPTIONS.map((p) => (
                          <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                        <MenuItem value="Otro">Otro</MenuItem>
                      </TextField>

                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                        <Button
                          size="small"
                          variant={tutorEsPrincipal ? "contained" : "outlined"}
                          onClick={() => setTutorEsPrincipal((v) => !v)}
                          sx={{ textTransform: "none", fontSize: 13 }}
                        >
                          {tutorEsPrincipal ? "✓ Contacto principal" : "Marcar como principal"}
                        </Button>
                        <Box flex={1} />
                        <Button
                          size="small"
                          color="inherit"
                          onClick={resetTutorForm}
                          sx={{ textTransform: "none" }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleAddTutor}
                          disabled={tutorSubmitting || !isLinkReady}
                          startIcon={
                            tutorSubmitting ? (
                              <CircularProgress size={13} color="inherit" />
                            ) : undefined
                          }
                          sx={{ textTransform: "none" }}
                        >
                          {tutorSubmitting ? "Vinculando..." : "Vincular"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )}

                {canManageTutores && !showAddTutor && (
                  <Button
                    startIcon={<Add />}
                    variant="outlined"
                    size="small"
                    onClick={() => setShowAddTutor(true)}
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
                  >
                    Vincular tutor
                  </Button>
                )}
              </Stack>
            </Box>

            {/* ── Tab 3: Evaluaciones ─────────────────────────────────────── */}
            <Box hidden={tab !== 3}>
              <SectionPlaceholder
                icon={<AssessmentOutlined fontSize="inherit" />}
                title="Evaluaciones clínicas"
                description="Aquí se registrarán y consultarán las evaluaciones de desarrollo, instrumentos aplicados y resultados. Disponible próximamente."
              />
            </Box>

            {/* ── Tab 4: Reportes ─────────────────────────────────────────── */}
            <Box hidden={tab !== 4}>
              <SectionPlaceholder
                icon={<FolderOpenOutlined fontSize="inherit" />}
                title="Reportes"
                description="Los reportes generados para este paciente aparecerán aquí. Disponible próximamente."
              />
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
