import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Divider,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  alpha,
  useTheme,
} from "@mui/material";
import {
  CreditCardOutlined,
  AccountBalanceOutlined,
  CheckCircleOutlined,
  ArrowBackOutlined,
  ShoppingBagOutlined,
  InfoOutlined,
} from "@mui/icons-material";
import { http } from "../../api/http";

const steps = ["Resumen", "Pago", "Confirmación"];

// Algoritmo de Luhn para validar tarjetas
function validateLuhn(number: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export default function CheckoutPage() {
  const theme = useTheme();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planId = params.get("plan");

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [metodo, setMetodo] = useState("tarjeta");
  const [cardData, setCardData] = useState({
    nombre: "",
    numero: "",
    exp: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const val = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    }
    return val;
  };

  const formatExpiry = (value: string) => {
    const val = value.replace(/[^\d]/g, "");
    if (val.length >= 3) {
      return `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    return val;
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "nombre":
        return value.trim().length < 3 ? "Ingresa el nombre completo del titular" : "";
      case "numero": {
        const clean = value.replace(/\s+/g, "");
        if (!clean) return "El número de tarjeta es obligatorio";
        if (clean.length < 15 || clean.length > 16) return "El número debe tener 15 o 16 dígitos";
        if (!validateLuhn(clean)) return "Número de tarjeta inválido";
        return "";
      }
      case "exp":
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(value)) return "Formato inválido (MM/YY)";
        return "";
      case "cvv":
        return value.length < 3 || value.length > 4 ? "CVV inválido (3-4 dígitos)" : "";
      default:
        return "";
    }
  };

  const handleBlur = (name: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, (cardData as any)[name]),
    }));
  };

  useEffect(() => {
    if (!planId) {
      navigate("/planes");
      return;
    }

    async function initCheckout() {
      try {
        setLoading(true);
        let monto = 999;
        if (planId === "anual") monto = 9990;
        if (planId === "pro_mensual") monto = 1499;

        const res = await http.post("/checkout/session", {
          plan_nombre: planId,
          monto,
          moneda: "MXN",
        });
        setSession(res.data);
      } catch (err) {
        console.error(err);
        setError("Error al iniciar el checkout. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    }

    initCheckout();
  }, [planId, navigate]);

  const handleNext = async () => {
    if (activeStep === 0) {
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (metodo === "tarjeta") {
        const newErrors: Record<string, string> = {
          nombre: validateField("nombre", cardData.nombre),
          numero: validateField("numero", cardData.numero),
          exp: validateField("exp", cardData.exp),
          cvv: validateField("cvv", cardData.cvv),
        };

        setErrors(newErrors);
        if (Object.values(newErrors).some((e) => e)) return;
      }

      try {
        setLoading(true);
        setError(null);

        await http.post(`/checkout/session/${session.token}/pago`, {
          metodo,
          email_provisional: "",
        });

        setActiveStep(2);
      } catch (err) {
        setError("El pago simulado ha fallado. Revisa los datos de tu tarjeta.");
      } finally {
        setLoading(false);
      }
    } else if (activeStep === 2) {
      navigate(`/registro-clinica?token=${session.token}`);
    }
  };

  if (loading && !session) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 12, gap: 2 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary">Iniciando checkout...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate("/planes")}
            color="inherit"
            sx={{ fontWeight: 700 }}
          >
            Volver a planes
          </Button>
        </Stack>

        <Typography variant="h3" fontWeight="900" gutterBottom letterSpacing="-1px">
          Completar suscripción
        </Typography>
        <Typography color="text.secondary" mb={4}>
          Estás a un paso de digitalizar tu clínica con AutiSense.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ py: 4, mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Grid container spacing={4}>
          <Grid sx={{ gridColumn: { xs: "span 12", md: "span 7" } }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              {activeStep === 0 && (
                <Stack spacing={4}>
                  <Typography variant="h6" fontWeight="800">Resumen de tu pedido</Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 2, border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
                        <ShoppingBagOutlined />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="800" sx={{ textTransform: "uppercase" }}>{session?.plan_nombre || ""}</Typography>
                        <Typography variant="body2" color="text.secondary">Suscripción recurrente</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="h5" fontWeight="900" color="primary.main">
                      ${session?.monto?.toLocaleString() || "0"} {session?.moneda}
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Subtotal</Typography>
                      <Typography fontWeight="700">${session?.monto?.toLocaleString() || "0"}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="h6" fontWeight="800">Total a pagar</Typography>
                      <Typography variant="h5" fontWeight="900" color="primary.main">
                        ${session?.monto?.toLocaleString() || "0"} {session?.moneda}
                      </Typography>
                    </Box>
                  </Stack>

                  <Button variant="contained" fullWidth size="large" onClick={handleNext} sx={{ py: 2, borderRadius: 2, fontWeight: 800 }}>
                    Continuar al pago
                  </Button>
                </Stack>
              )}

              {activeStep === 1 && (
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="h6" fontWeight="800" gutterBottom>Método de Pago</Typography>
                    <Typography variant="body2" color="text.secondary">Selecciona cómo deseas realizar tu pago inicial.</Typography>
                  </Box>

                  {error && <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>{error}</Alert>}

                  <FormControl>
                    <RadioGroup value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                      <Stack spacing={2}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            border: "2px solid",
                            borderColor: metodo === "tarjeta" ? "primary.main" : "divider",
                            bgcolor: metodo === "tarjeta" ? alpha(theme.palette.primary.main, 0.04) : "background.paper",
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onClick={() => setMetodo("tarjeta")}
                        >
                          <FormControlLabel value="tarjeta" control={<Radio />} label={
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <CreditCardOutlined color={metodo === "tarjeta" ? "primary" : "action"} />
                              <Typography fontWeight="700">Tarjeta de Crédito / Débito</Typography>
                            </Stack>
                          } />
                        </Paper>

                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
                            border: "2px solid",
                            borderColor: metodo === "paypal" ? "primary.main" : "divider",
                            bgcolor: metodo === "paypal" ? alpha(theme.palette.primary.main, 0.04) : "background.paper",
                            borderRadius: 2,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onClick={() => setMetodo("paypal")}
                        >
                          <FormControlLabel value="paypal" control={<Radio />} label={
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <AccountBalanceOutlined color={metodo === "paypal" ? "primary" : "action"} />
                              <Typography fontWeight="700">PayPal</Typography>
                            </Stack>
                          } />
                        </Paper>
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  {metodo === "tarjeta" && (
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2.5}>
                        <Grid sx={{ gridColumn: "span 12" }}>
                          <TextField
                            label="Nombre en la tarjeta"
                            fullWidth
                            required
                            placeholder="Como aparece en el plástico"
                            value={cardData.nombre}
                            onChange={(e) => setCardData({ ...cardData, nombre: e.target.value })}
                            onBlur={() => handleBlur("nombre")}
                            error={!!errors.nombre}
                            helperText={errors.nombre || " "}
                          />
                        </Grid>
                        <Grid sx={{ gridColumn: "span 12" }}>
                          <TextField
                            label="Número de tarjeta"
                            fullWidth
                            required
                            placeholder="0000 0000 0000 0000"
                            value={cardData.numero}
                            onChange={(e) => setCardData({ ...cardData, numero: formatCardNumber(e.target.value) })}
                            onBlur={() => handleBlur("numero")}
                            error={!!errors.numero}
                            helperText={errors.numero || " "}
                            inputProps={{ maxLength: 19 }}
                          />
                        </Grid>
                        <Grid sx={{ gridColumn: { xs: "span 6", sm: "span 6" } }}>
                          <TextField
                            label="Expiración"
                            fullWidth
                            required
                            placeholder="MM/YY"
                            value={cardData.exp}
                            onChange={(e) => setCardData({ ...cardData, exp: formatExpiry(e.target.value) })}
                            onBlur={() => handleBlur("exp")}
                            error={!!errors.exp}
                            helperText={errors.exp || " "}
                            inputProps={{ maxLength: 5 }}
                          />
                        </Grid>
                        <Grid sx={{ gridColumn: { xs: "span 6", sm: "span 6" } }}>
                          <TextField
                            label="CVC / CVV"
                            fullWidth
                            required
                            type="password"
                            placeholder="•••"
                            value={cardData.cvv}
                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "") })}
                            onBlur={() => handleBlur("cvv")}
                            error={!!errors.cvv}
                            helperText={errors.cvv || " "}
                            inputProps={{ maxLength: 4 }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleNext}
                    disabled={loading}
                    sx={{ py: 2, borderRadius: 2, fontWeight: 800 }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : metodo === "paypal" ? (
                      "Pagar con PayPal"
                    ) : (
                      "Confirmar y pagar"
                    )}
                  </Button>
                </Stack>
              )}

              {activeStep === 2 && (
                <Stack spacing={4} textAlign="center" py={4}>
                  <Box>
                    <CheckCircleOutlined sx={{ fontSize: 80, color: "success.main", mb: 2 }} />
                    <Typography variant="h4" fontWeight="900">¡Pago Exitoso!</Typography>
                    <Typography color="text.secondary">Tu suscripción ha sido activada correctamente.</Typography>
                  </Box>

                  <Paper elevation={0} sx={{ p: 3, bgcolor: "action.hover", borderRadius: 2, textAlign: "left" }}>
                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: "primary.main", color: "white" }}>
                        <InfoOutlined fontSize="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="800">Siguiente paso: Registro de clínica</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ahora configuraremos los datos de tu clínica y crearemos tu cuenta de administrador principal.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  <Button variant="contained" fullWidth size="large" onClick={handleNext} sx={{ py: 2, borderRadius: 2, fontWeight: 800 }}>
                    Configurar mi clínica
                  </Button>
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid sx={{ gridColumn: { xs: "span 12", md: "span 5" } }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
              <Typography variant="subtitle2" fontWeight="800" gutterBottom>DETALLES DEL PLAN</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Estás comprando el acceso al **{session?.plan_nombre}**. Este plan incluye análisis de IA, gestión de pacientes y reportes avanzados.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Nota: Este es un entorno de simulación. No se realizará ningún cargo real a tu tarjeta de crédito.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
