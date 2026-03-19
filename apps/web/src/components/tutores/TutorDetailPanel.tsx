import {
  AssignmentIndOutlined,
  ChildCareOutlined,
  PersonOutlined,
  VerifiedUserOutlined,
} from "@mui/icons-material";
import {
  alpha,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { http } from "../../api/http";

type PacienteVinculado = {
  vinculoId: number;
  pacienteId: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  fecha_nacimiento: string;
  sexo: string;
  estado: string;
  diagnostico_presuntivo: string | null;
  clinicaNombre: string | null;
  parentesco: string;
  es_principal: boolean;
};

export type TutorDetail = {
  id: number;
  usuarioId: number;
  nombre: string;
  ap_paterno: string;
  ap_materno: string | null;
  nombreCompleto: string;
  telefono: string | null;
  parentesco: string | null;
  correo: string;
  estado: string;
  mfaEnabled: boolean;
  clinicaId: number | null;
  clinicaNombre: string | null;
  pacientesVinculados: number;
  pacientes: PacienteVinculado[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  tutorId: number | null;
  onClose: () => void;
};

function calcEdad(fecha: string): string {
  const hoy = new Date();
  const nac = new Date(fecha);
  let años = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) años--;
  return años === 1 ? "1 año" : `${años} años`;
}

function a11yProps(index: number) {
  return {
    id: `tutor-detail-tab-${index}`,
    "aria-controls": `tutor-detail-tabpanel-${index}`,
  };
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
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
      <Box sx={{ color: "primary.main", display: "flex", alignItems: "center" }}>
        {icon}
      </Box>
      <Typography component="span" variant="subtitle1" fontWeight={800}>
        {title}
      </Typography>
    </Stack>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5 }}>
        {value && value.trim() ? value : "—"}
      </Typography>
    </Box>
  );
}

function StatusChip({ estado }: { estado: string }) {
  const isActivo = estado === "activo";
  const isPendiente = estado === "pendiente";

  return (
    <Chip
      label={isActivo ? "Activo" : isPendiente ? "Pendiente" : "Suspendido"}
      size="small"
      sx={{
        fontWeight: 700,
        color: isActivo ? "#0F766E" : isPendiente ? "#9A3412" : "#B91C1C",
        bgcolor: isActivo
          ? alpha("#2A9D8F", 0.14)
          : isPendiente
            ? alpha("#F59E0B", 0.18)
            : alpha("#EF4444", 0.14),
      }}
    />
  );
}

export default function TutorDetailPanel({ open, tutorId, onClose }: Props) {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tutorId) return;

    setTab(0);
    setData(null);
    setError(null);
    setLoading(true);

    http
      .get<TutorDetail>(`/tutores/${tutorId}`)
      .then((res) => setData(res.data))
      .catch(() => setError("No se pudo cargar el detalle del tutor."))
      .finally(() => setLoading(false));
  }, [open, tutorId]);

  const initial =
    data?.nombre?.charAt(0)?.toUpperCase() || data?.correo?.charAt(0)?.toUpperCase() || "T";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, minHeight: 540 } }}
    >
      <DialogTitle sx={{ pb: 0, pt: 3 }}>
        {data ? (
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
                bgcolor: alpha("#2A9D8F", 0.12),
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              {initial}
            </Box>

            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography component="span" variant="h6" fontWeight={800} lineHeight={1.2}>
                  {data.nombreCompleto}
                </Typography>
                <StatusChip estado={data.estado} />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {data.parentesco || "Sin parentesco"} · {data.clinicaNombre ?? "Sin clínica"} ·{" "}
                {data.pacientesVinculados === 0
                  ? "Sin pacientes vinculados"
                  : `${data.pacientesVinculados} paciente${data.pacientesVinculados !== 1 ? "s" : ""
                  }`}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Typography component="span" variant="h6" fontWeight={800}>
            Detalle de tutor
          </Typography>
        )}
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, nextTab) => setTab(nextTab)}
        sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider", mt: 2 }}
      >
        <Tab
          icon={<PersonOutlined fontSize="small" />}
          iconPosition="start"
          label="Perfil"
          {...a11yProps(0)}
        />
        <Tab
          icon={<ChildCareOutlined fontSize="small" />}
          iconPosition="start"
          label="Pacientes"
          {...a11yProps(1)}
        />
      </Tabs>

      <DialogContent sx={{ pt: 3 }}>
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && data && (
          <>
            <Box hidden={tab !== 0}>
              <Stack spacing={2}>
                <SectionCard>
                  <SectionTitle
                    icon={<AssignmentIndOutlined fontSize="small" />}
                    title="Datos personales"
                  />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: 2.5,
                    }}
                  >
                    <Field label="Nombre completo" value={data.nombreCompleto} />
                    <Field label="Parentesco" value={data.parentesco} />
                    <Field label="Teléfono" value={data.telefono} />
                    <Field label="Clínica" value={data.clinicaNombre} />
                  </Box>
                </SectionCard>

                <SectionCard>
                  <SectionTitle
                    icon={<VerifiedUserOutlined fontSize="small" />}
                    title="Datos de acceso"
                  />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                      gap: 2.5,
                    }}
                  >
                    <Field label="Correo electrónico" value={data.correo} />
                    <Field label="MFA" value={data.mfaEnabled ? "Activado" : "Desactivado"} />
                    <Field
                      label="Fecha de creación"
                      value={new Date(data.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    />
                    <Field
                      label="Última actualización"
                      value={new Date(data.updatedAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    />
                  </Box>
                </SectionCard>
              </Stack>
            </Box>

            <Box hidden={tab !== 1}>
              <Stack spacing={2}>
                {data.pacientes.length === 0 ? (
                  <SectionCard>
                    <Stack alignItems="center" spacing={1.5} sx={{ py: 4 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: alpha("#2A9D8F", 0.1),
                          color: "primary.main",
                          fontSize: 22,
                        }}
                      >
                        <ChildCareOutlined fontSize="inherit" />
                      </Box>
                      <Typography fontWeight={700}>Sin pacientes vinculados</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Este tutor aún no tiene pacientes a su cargo. Puedes vincularlos desde el
                        módulo de Pacientes.
                      </Typography>
                    </Stack>
                  </SectionCard>
                ) : (
                  data.pacientes.map((paciente) => (
                    <Paper
                      key={paciente.vinculoId}
                      elevation={0}
                      sx={{
                        px: 2,
                        py: 1.75,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: paciente.es_principal ? "primary.main" : "divider",
                        bgcolor: paciente.es_principal
                          ? alpha("#2A9D8F", 0.04)
                          : "background.paper",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
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
                          {paciente.nombre.charAt(0).toUpperCase()}
                          {paciente.ap_paterno.charAt(0).toUpperCase()}
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={700} noWrap>
                              {[paciente.nombre, paciente.ap_paterno, paciente.ap_materno]
                                .filter(Boolean)
                                .join(" ")}
                            </Typography>

                            {paciente.es_principal && (
                              <Chip
                                label="Principal"
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                          </Stack>

                          <Typography variant="body2" color="text.secondary" noWrap>
                            {calcEdad(paciente.fecha_nacimiento)} · {paciente.parentesco} ·{" "}
                            {paciente.clinicaNombre ?? "Sin clínica"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}