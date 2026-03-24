import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Step,
  Stepper,
  StepLabel,
  Avatar,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  ApartmentOutlined,
  AdminPanelSettingsOutlined,
  CheckCircleOutlined,
  InfoOutlined,
} from "@mui/icons-material";
import { http } from "../../api/http";
import { useAuth } from "../../auth/AuthContext";

const steps = ["Clínica", "Administrador"];

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/i;
const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegistroClinicaPublicoPage() {
  const theme = useTheme();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const { completeMfaLogin } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre_clinica: "",
    razon_social: "",
    rfc: "",
    telefono_clinica: "",
    correo_clinica: "",
    direccion: "",
    nombre_admin: "",
    ap_paterno_admin: "",
    ap_materno_admin: "",
    correo_admin: "",
    password_admin: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      navigate("/planes");
      return;
    }

    async function validateSession() {
      try {
        setLoading(true);
        const res = await http.get(`/checkout/session/${token}`);
        setSession(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Sesión de registro no válida o expirada.");
      } finally {
        setLoading(false);
      }
    }

    validateSession();
  }, [token, navigate]);

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "nombre_clinica":
        return value.trim().length < 3 ? "Mínimo 3 caracteres" : "";
      case "correo_clinica":
      case "correo_admin":
        return !EMAIL_REGEX.test(value) ? "Correo inválido" : "";
      case "telefono_clinica":
        return value && !PHONE_REGEX.test(value.replace(/\D/g, "")) ? "Deben ser 10 dígitos" : "";
      case "rfc":
        return value && !RFC_REGEX.test(value) ? "RFC inválido (ej: ABC123456XYZ)" : "";
      case "nombre_admin":
      case "ap_paterno_admin":
        return value.trim().length < 2 ? "Campo obligatorio" : "";
      case "password_admin":
        return value.length < 8 ? "Mínimo 8 caracteres" : "";
      case "confirm_password":
        return value !== formData.password_admin ? "Las contraseñas no coinciden" : "";
      default:
        return "";
    }
  };

  const handleBlur = (name: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, (formData as any)[name]),
    }));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      const stepErrors: Record<string, string> = {
        nombre_clinica: validateField("nombre_clinica", formData.nombre_clinica),
        correo_clinica: validateField("correo_clinica", formData.correo_clinica),
        rfc: validateField("rfc", formData.rfc),
        telefono_clinica: validateField("telefono_clinica", formData.telefono_clinica),
      };

      setErrors(stepErrors);
      if (Object.values(stepErrors).some((e) => e)) {
        setError("Revisa los errores en los campos de la clínica.");
        return;
      }
      setError(null);
      setActiveStep(1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    const stepErrors: Record<string, string> = {
      nombre_admin: validateField("nombre_admin", formData.nombre_admin),
      ap_paterno_admin: validateField("ap_paterno_admin", formData.ap_paterno_admin),
      correo_admin: validateField("correo_admin", formData.correo_admin),
      password_admin: validateField("password_admin", formData.password_admin),
      confirm_password: validateField("confirm_password", formData.confirm_password),
    };

    setErrors(stepErrors);
    if (Object.values(stepErrors).some((e) => e)) {
      setError("Revisa los errores en los datos del administrador.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await http.post(`/checkout/session/${token}/finalizar`, formData);
      completeMfaLogin(res.data);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || "Ocurrió un error al crear la clínica.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !session && !error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Validando sesión...</Typography>
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Box sx={{ maxWidth: 500, mx: "auto", mt: 10, textAlign: "center" }}>
        <Alert severity="error" variant="filled" sx={{ borderRadius: 2, mb: 4 }}>
          {error}
        </Alert>
        <Button fullWidth variant="outlined" size="large" sx={{ borderRadius: 2, fontWeight: 700 }} onClick={() => navigate("/planes")}>
          Volver a planes
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
      <Stack spacing={2} textAlign="center" mb={6}>
        <Typography variant="h3" fontWeight="900" letterSpacing="-1px">Finaliza tu registro</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
          Configura los datos de tu clínica y crea tu cuenta de administrador principal para comenzar.
        </Typography>
      </Stack>

      <Stepper activeStep={activeStep} sx={{ mb: 6 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" variant="filled" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
        {activeStep === 0 && (
          <Stack spacing={4}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}>
                <ApartmentOutlined />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="800">Datos de la Clínica</Typography>
                <Typography variant="body2" color="text.secondary">Información legal y de contacto de tu centro.</Typography>
              </Box>
            </Stack>

            <Grid container spacing={3}>
              <Grid key="nombre_clinica" size={12}>
                <TextField 
                  label="Nombre Comercial de la Clínica" 
                  fullWidth required
                  placeholder="Ej: Clínica Autisense CDMX"
                  value={formData.nombre_clinica}
                  onChange={(e) => setFormData({...formData, nombre_clinica: e.target.value})}
                  onBlur={() => handleBlur("nombre_clinica")}
                  error={!!errors.nombre_clinica}
                  helperText={errors.nombre_clinica || " "}
                />
              </Grid>
              <Grid key="razon_social" size={12}>
                <TextField 
                  label="Razón Social (Opcional)" 
                  fullWidth 
                  placeholder="Ej: Servicios Médicos S.A. de C.V."
                  value={formData.razon_social}
                  onChange={(e) => setFormData({...formData, razon_social: e.target.value})}
                />
              </Grid>
              <Grid key="rfc" size={12}>
                <TextField 
                  label="RFC (Registro Federal de Contribuyentes)" 
                  fullWidth 
                  placeholder="ABCD123456XYZ"
                  value={formData.rfc}
                  onChange={(e) => setFormData({...formData, rfc: e.target.value.toUpperCase()})}
                  onBlur={() => handleBlur("rfc")}
                  error={!!errors.rfc}
                  helperText={errors.rfc || " "}
                />
              </Grid>
              <Grid key="telefono_clinica" size={12}>
                <TextField 
                  label="Teléfono de Contacto de la Clínica" 
                  fullWidth 
                  placeholder="10 dígitos (ej: 5512345678)"
                  value={formData.telefono_clinica}
                  onChange={(e) => setFormData({...formData, telefono_clinica: e.target.value.replace(/\D/g, "").slice(0, 10)})}
                  onBlur={() => handleBlur("telefono_clinica")}
                  error={!!errors.telefono_clinica}
                  helperText={errors.telefono_clinica || " "}
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>
              <Grid key="correo_clinica" size={12}>
                <TextField 
                  label="Correo Electrónico Oficial" 
                  type="email" 
                  fullWidth required
                  placeholder="contacto@clinica.com"
                  value={formData.correo_clinica}
                  onChange={(e) => setFormData({...formData, correo_clinica: e.target.value})}
                  onBlur={() => handleBlur("correo_clinica")}
                  error={!!errors.correo_clinica}
                  helperText={errors.correo_clinica || " "}
                />
              </Grid>
              <Grid key="direccion" size={12}>
                <TextField 
                  label="Dirección Completa de la Clínica" 
                  fullWidth multiline rows={3} 
                  placeholder="Calle, Número, Colonia, Código Postal, Ciudad, Estado"
                  value={formData.direccion}
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                />
              </Grid>
            </Grid>

            <Button variant="contained" size="large" onClick={handleNext} sx={{ mt: 2, py: 2, borderRadius: 2, fontWeight: 800 }}>
              Continuar: Datos de Administrador
            </Button>
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={4}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}>
                <AdminPanelSettingsOutlined />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="800">Responsable de Cuenta</Typography>
                <Typography variant="body2" color="text.secondary">Esta cuenta tendrá permisos totales sobre la clínica.</Typography>
              </Box>
            </Stack>

            <Grid container spacing={3}>
              <Grid key="nombre_admin" size={12}>
                <TextField 
                  label="Nombre Completo del Responsable" 
                  fullWidth required
                  value={formData.nombre_admin}
                  onChange={(e) => setFormData({...formData, nombre_admin: e.target.value})}
                  onBlur={() => handleBlur("nombre_admin")}
                  error={!!errors.nombre_admin}
                  helperText={errors.nombre_admin || " "}
                />
              </Grid>
              <Grid key="ap_paterno_admin" size={12}>
                <TextField 
                  label="Apellido Paterno" 
                  fullWidth required
                  value={formData.ap_paterno_admin}
                  onChange={(e) => setFormData({...formData, ap_paterno_admin: e.target.value})}
                  onBlur={() => handleBlur("ap_paterno_admin")}
                  error={!!errors.ap_paterno_admin}
                  helperText={errors.ap_paterno_admin || " "}
                />
              </Grid>
              <Grid key="ap_materno_admin" size={12}>
                <TextField 
                  label="Apellido Materno" 
                  fullWidth 
                  value={formData.ap_materno_admin}
                  onChange={(e) => setFormData({...formData, ap_materno_admin: e.target.value})}
                />
              </Grid>
              <Grid key="correo_admin" size={12}>
                <TextField 
                  label="Dirección de Correo Electrónico (Para Iniciar Sesión)" 
                  type="email" 
                  fullWidth required
                  placeholder="tu_nombre@empresa.com"
                  value={formData.correo_admin}
                  onChange={(e) => setFormData({...formData, correo_admin: e.target.value})}
                  onBlur={() => handleBlur("correo_admin")}
                  error={!!errors.correo_admin}
                  helperText={errors.correo_admin || " "}
                />
              </Grid>
              <Grid key="password_admin" size={12}>
                <TextField 
                  label="Crea una Contraseña Segura" 
                  type="password" 
                  fullWidth required
                  value={formData.password_admin}
                  onChange={(e) => setFormData({...formData, password_admin: e.target.value})}
                  onBlur={() => handleBlur("password_admin")}
                  error={!!errors.password_admin}
                  helperText={errors.password_admin || " "}
                />
              </Grid>
              <Grid key="confirm_password" size={12}>
                <TextField 
                  label="Confirma tu Contraseña" 
                  type="password" 
                  fullWidth required
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                  onBlur={() => handleBlur("confirm_password")}
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password || " "}
                />
              </Grid>
            </Grid>

            <Divider />

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" size="large" onClick={() => setActiveStep(0)} sx={{ flex: 1, py: 2, borderRadius: 2, fontWeight: 700 }}>
                Volver
              </Button>
              <Button variant="contained" size="large" color="success" onClick={handleSubmit} disabled={loading} sx={{ flex: 2, py: 2, borderRadius: 2, fontWeight: 800 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : "Crear clínica y entrar"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
