import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBackOutlined } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import { useAuth } from "../auth/AuthContext";

type SettingsTab = "perfil" | "seguridad" | "ayuda";

function useSettingsTab(): [SettingsTab, (tab: SettingsTab) => void] {
  const location = useLocation();
  const navigate = useNavigate();

  const search = new URLSearchParams(location.search);
  const raw = search.get("tab");

  const resolvedTab: SettingsTab =
    raw === "seguridad" || raw === "ayuda" || raw === "perfil" ? raw : "perfil";

  const [tab, setTabState] = useState<SettingsTab>(resolvedTab);

  useEffect(() => {
    setTabState(resolvedTab);
  }, [resolvedTab]);

  const setTab = (nextTab: SettingsTab) => {
    setTabState(nextTab);
    navigate(`/configuracion?tab=${nextTab}`, { replace: true });
  };

  return [tab, setTab];
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography color="text.secondary">{subtitle}</Typography>
      ) : null}
    </Box>
  );
}

export default function ConfiguracionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useSettingsTab();

  const tabs = useMemo(
    () => [
      { key: "perfil" as const, label: "Mi perfil" },
      { key: "seguridad" as const, label: "Inicio de sesión y seguridad" },
      { key: "ayuda" as const, label: "Ayuda" },
    ],
    []
  );

  return (
    <AdminLayout
      title="Configuración"
      subtitle="Cuenta, seguridad y ayuda del sistema"
      hideSidebar
    >
      <Box
        sx={{
          maxWidth: 1180,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "280px 1fr" },
          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
            alignSelf: "start",
          }}
        >
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
              Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preferencias y seguridad
            </Typography>
          </Box>

          <List sx={{ px: 1, pb: 1 }}>
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;

              return (
                <ListItemButton
                  key={tab.key}
                  selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    minHeight: 44,
                  }}
                >
                  <ListItemText
                    primary={tab.label}
                    primaryTypographyProps={{
                      fontWeight: selected ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ArrowBackOutlined />}
              onClick={() => navigate("/dashboard")}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                borderRadius: 1.5,
              }}
            >
              Volver
            </Button>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, md: 3 },
          }}
        >
          {activeTab === "perfil" ? (
            <Stack spacing={3}>
              <SectionTitle
                title="Mi perfil"
                subtitle="Información básica de la cuenta actual."
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Correo"
                  value={user?.correo ?? ""}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Rol"
                  value={user?.role ?? ""}
                  fullWidth
                  disabled
                />
                <TextField
                  label="Clínica asociada"
                  value={
                    user?.clinicId == null ? "Sistema / Sin clínica" : `Clínica #${user.clinicId}`
                  }
                  fullWidth
                  disabled
                />
                <TextField
                  label="Estado"
                  value="Activo"
                  fullWidth
                  disabled
                />
              </Box>

              <Alert severity="info" variant="outlined">
                Más adelante aquí podrás editar datos personales y preferencias de cuenta.
              </Alert>
            </Stack>
          ) : null}

          {activeTab === "seguridad" ? (
            <Stack spacing={3}>
              <SectionTitle
                title="Inicio de sesión y seguridad"
                subtitle="Controles básicos de acceso y protección de la cuenta."
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Contraseña actual"
                  type="password"
                  fullWidth
                />
                <Box />

                <TextField
                  label="Nueva contraseña"
                  type="password"
                  fullWidth
                />
                <TextField
                  label="Confirmar nueva contraseña"
                  type="password"
                  fullWidth
                />
              </Box>

              <Divider />

              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700 }}>
                  Opciones de seguridad
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        Solicitar cambio periódico de contraseña
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Placeholder visual para futuras políticas.
                      </Typography>
                    </Box>
                    <Switch />
                  </Stack>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        Autenticación de dos factores
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Próximamente.
                      </Typography>
                    </Box>
                    <Switch disabled />
                  </Stack>
                </Paper>
              </Stack>

              <Stack direction="row" justifyContent="flex-start">
                <Button variant="contained">Guardar cambios</Button>
              </Stack>
            </Stack>
          ) : null}

          {activeTab === "ayuda" ? (
            <Stack spacing={3}>
              <SectionTitle
                title="Ayuda"
                subtitle="Recursos de apoyo y orientación del sistema."
              />

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                  Centro de ayuda
                </Typography>
                <Typography color="text.secondary">
                  Aquí podremos colocar preguntas frecuentes, guías rápidas y enlaces a documentación interna.
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                  Soporte
                </Typography>
                <Typography color="text.secondary">
                  Cuando definamos el canal, aquí puede mostrarse correo de soporte, mesa de ayuda o formulario de contacto.
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                  Información del sistema
                </Typography>
                <Typography color="text.secondary">
                  AutiSense · Panel administrativo
                </Typography>
                <Typography color="text.secondary">
                  Versión visible próximamente
                </Typography>
              </Paper>
            </Stack>
          ) : null}
        </Paper>
      </Box>
    </AdminLayout>
  );
}