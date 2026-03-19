import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBackOutlined, Visibility, VisibilityOff } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import { useAuth } from "../auth/AuthContext";
import { http } from "../api/http";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

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
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useSettingsTab();

  // ── Password form ──────────────────────────────────────────────────────────
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
  });

  const onSavePassword = async (data: PasswordForm) => {
    setPwdError(null);
    setPwdSuccess(null);
    setPwdLoading(true);
    try {
      await http.patch("/me/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setPwdSuccess("Contraseña actualizada correctamente.");
      resetForm();
    } catch (e: any) {
      setPwdError(e?.response?.data?.message ?? "No se pudo actualizar la contraseña.");
    } finally {
      setPwdLoading(false);
    }
  };

  // ── MFA toggle ─────────────────────────────────────────────────────────────
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);

  const handleMfaToggle = async () => {
    if (mfaLoading || !user) return;
    const next = !user.mfaEnabled;
    setMfaError(null);
    setMfaLoading(true);
    try {
      await http.patch("/me/mfa", { mfaEnabled: next });
      const updated = { ...user, mfaEnabled: next };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setMfaSuccess(next ? "Autenticación de dos factores activada." : "Autenticación de dos factores desactivada.");
    } catch (e: any) {
      setMfaError(e?.response?.data?.message ?? "No se pudo actualizar la configuración MFA.");
    } finally {
      setMfaLoading(false);
    }
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────
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
        {/* ── Sidebar nav ── */}
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
                  sx={{ borderRadius: 1.5, mb: 0.5, minHeight: 44 }}
                >
                  <ListItemText
                    primary={tab.label}
                    primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
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
              sx={{ justifyContent: "flex-start", textTransform: "none", borderRadius: 1.5 }}
            >
              Volver
            </Button>
          </Box>
        </Paper>

        {/* ── Content panel ── */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            p: { xs: 2, md: 3 },
          }}
        >
          {/* ── Mi perfil ── */}
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
                <TextField label="Correo" value={user?.correo ?? ""} fullWidth disabled />
                <TextField label="Rol" value={user?.role ?? ""} fullWidth disabled />
                <TextField
                  label="Clínica asociada"
                  value={user?.clinicId == null ? "Sistema / Sin clínica" : `Clínica #${user.clinicId}`}
                  fullWidth
                  disabled
                />
                <TextField label="Estado" value="Activo" fullWidth disabled />
              </Box>
              <Alert severity="info" variant="outlined">
                Más adelante aquí podrás editar datos personales y preferencias de cuenta.
              </Alert>
            </Stack>
          ) : null}

          {/* ── Seguridad ── */}
          {activeTab === "seguridad" ? (
            <Stack spacing={3} component="form" onSubmit={handleSubmit(onSavePassword)} noValidate>
              <SectionTitle
                title="Inicio de sesión y seguridad"
                subtitle="Controles básicos de acceso y protección de la cuenta."
              />

              {/* Password fields */}
              <Stack spacing={2}>
                <TextField
                  label="Contraseña actual"
                  type={showCurrent ? "text" : "password"}
                  fullWidth
                  {...register("currentPassword")}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message ?? " "}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end" size="small">
                          {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Nueva contraseña"
                    type={showNew ? "text" : "password"}
                    fullWidth
                    {...register("newPassword")}
                    error={!!errors.newPassword}
                    helperText={errors.newPassword?.message ?? " "}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNew((v) => !v)} edge="end" size="small">
                            {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Confirmar nueva contraseña"
                    type={showConfirm ? "text" : "password"}
                    fullWidth
                    {...register("confirmPassword")}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message ?? " "}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" size="small">
                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {pwdError && <Alert severity="error">{pwdError}</Alert>}
                {pwdSuccess && <Alert severity="success">{pwdSuccess}</Alert>}
              </Stack>

              {/* Submit password form */}
              <Stack direction="row" justifyContent="flex-start">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={pwdLoading}
                  startIcon={pwdLoading ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ textTransform: "none" }}
                >
                  {pwdLoading ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </Stack>

              <Divider />

              {/* MFA toggle */}
              <Stack spacing={2}>
                <Typography sx={{ fontWeight: 700 }}>Opciones de seguridad</Typography>

                <Paper
                  elevation={0}
                  sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2 }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>
                        Autenticación de dos factores
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user?.mfaEnabled
                          ? "Activada. Se pedirá un código por correo al iniciar sesión."
                          : "Desactivada. Actívala para mayor seguridad."}
                      </Typography>
                      {mfaError && (
                        <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>
                          {mfaError}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ position: "relative", display: "flex", alignItems: "center" }}>
                      {mfaLoading && (
                        <CircularProgress size={20} sx={{ position: "absolute", left: -28 }} />
                      )}
                      <Switch
                        checked={user?.mfaEnabled ?? false}
                        onChange={handleMfaToggle}
                        disabled={mfaLoading}
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Stack>

              {/* MFA success snackbar */}
              <Snackbar
                open={!!mfaSuccess}
                autoHideDuration={3500}
                onClose={() => setMfaSuccess(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                message={mfaSuccess}
              />
            </Stack>
          ) : null}

          {/* ── Ayuda ── */}
          {activeTab === "ayuda" ? (
            <Stack spacing={3}>
              <SectionTitle
                title="Ayuda"
                subtitle="Recursos de apoyo y orientación del sistema."
              />

              <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Centro de ayuda</Typography>
                <Typography color="text.secondary">
                  Aquí podremos colocar preguntas frecuentes, guías rápidas y enlaces a documentación interna.
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Soporte</Typography>
                <Typography color="text.secondary">
                  Cuando definamos el canal, aquí puede mostrarse correo de soporte, mesa de ayuda o formulario de contacto.
                </Typography>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Información del sistema</Typography>
                <Typography color="text.secondary">AutiSense · Panel administrativo</Typography>
                <Typography color="text.secondary">Versión visible próximamente</Typography>
              </Paper>
            </Stack>
          ) : null}
        </Paper>
      </Box>
    </AdminLayout>
  );
}
