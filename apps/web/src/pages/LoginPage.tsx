import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { Visibility, VisibilityOff, DarkMode, LightMode } from "@mui/icons-material";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useColorMode } from "../theme/ColorModeProvider";

const schema = z.object({
  correo: z.string().email("Ingresa un correo válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72, "La contraseña no debe exceder 72 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const { mode, toggle } = useColorMode();

  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { correo: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setLoading(true);
    try {
      await login(data.correo, data.password);
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      setServerError(e?.response?.data?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const heroText = useMemo(
    () => ({
      overline: "AUTISENSE • PLATAFORMA CLÍNICA",
      title: "AutiSense",
      subtitle: "Gestión clínica inteligente",
    }),
    []
  );

  // Paleta AutiSense
  const teal = "#2A9D8F";
  const blue = "#457B9D";

  const shellBg =
    mode === "dark"
      ? "radial-gradient(circle at top, rgba(94,214,199,0.12), transparent 35%), linear-gradient(180deg, #070B10 0%, #0B1016 100%)"
      : "radial-gradient(circle at top, rgba(42,157,143,0.14), transparent 32%), linear-gradient(180deg, #F6FAFF 0%, #EEF3F8 100%)";

  const leftBg =
    mode === "dark"
      ? "linear-gradient(180deg, #0F1A22 0%, #0B1016 100%)"
      : "linear-gradient(180deg, #111A22 0%, #0D1218 100%)";

  const rightBg = mode === "dark" ? "#0F141B" : "#FFFFFF";
  const inputBg = mode === "dark" ? "#141C26" : "#FFFFFF";
  const textPrimary = mode === "dark" ? "#FFFFFF" : "#111111";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: shellBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 0, sm: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          minHeight: { xs: "100vh", sm: 680 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.03fr 0.97fr" },
          borderRadius: { xs: 0, sm: "34px" },
          overflow: "hidden",
          boxShadow:
            mode === "dark"
              ? "0 28px 90px rgba(0,0,0,0.55)"
              : "0 28px 80px rgba(16,24,40,0.18)",
          bgcolor: "transparent",
        }}
      >
        {/* Panel izquierdo (desktop) */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            position: "relative",
            overflow: "hidden",
            color: "#fff",
            background: leftBg,
            px: 6,
            py: 5,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(circle at 20% 25%, rgba(42,157,143,0.22), transparent 45%),
                radial-gradient(circle at 75% 65%, rgba(69,123,157,0.18), transparent 45%),
                radial-gradient(circle at 55% 30%, rgba(255,255,255,0.05), transparent 40%)
              `,
              pointerEvents: "none",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -58%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: 190,
              height: 190,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.10)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -58%)",
            }}
          />

          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: 430,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              minHeight: "100%",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,0.72)",
                mb: 10,
              }}
            >
              {heroText.overline}
            </Typography>

            <Typography
              sx={{
                fontSize: "clamp(3rem, 5vw, 5.2rem)",
                fontWeight: 300,
                lineHeight: 0.95,
                letterSpacing: "-0.05em",
                mb: 2,
              }}
            >
              {heroText.title}
            </Typography>

            <Typography
              sx={{
                fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.82)",
                maxWidth: 320,
              }}
            >
              {heroText.subtitle}
            </Typography>
          </Box>
        </Box>

        {/* Panel derecho */}
        <Box
          sx={{
            position: "relative",
            bgcolor: rightBg,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            px: { xs: 3, sm: 5, md: 7 },
            py: { xs: 4, sm: 4.5, md: 5 },
          }}
        >
          {/* SOLO toggle arriba derecha */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <IconButton onClick={toggle} aria-label="toggle theme" size="small">
              {mode === "dark" ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Box>

          {/* Form */}
          <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Box sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
              <Typography
                sx={{
                  fontSize: { xs: 38, md: 42 },
                  fontWeight: 300,
                  letterSpacing: "-0.04em",
                  color: textPrimary,
                  mb: 4,
                  textAlign: "center",
                }}
              >
                Iniciar sesión
              </Typography>

              {serverError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3 }}>
                  {serverError}
                </Alert>
              )}

              <Stack component="form" spacing={2.2} onSubmit={handleSubmit(onSubmit)}>
                {/* Inputs flotantes: label (no placeholder) */}
                <TextField
                  label="Correo"
                  variant="outlined"
                  fullWidth
                  {...register("correo")}
                  error={!!errors.correo}
                  helperText={errors.correo?.message ?? " "}
                  autoComplete="email"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "999px",
                      bgcolor: inputBg,
                      height: 56,
                    },
                  }}
                />

                <TextField
                  label="Contraseña"
                  type={showPass ? "text" : "password"}
                  inputProps={{ maxLength: 72 }}
                  variant="outlined"
                  fullWidth
                  {...register("password")}
                  error={!!errors.password}
                  helperText={errors.password?.message ?? " "}
                  autoComplete="current-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPass((v) => !v)} edge="end">
                          {showPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "999px",
                      bgcolor: inputBg,
                      height: 56,
                    },
                  }}
                />

                <Button
                  type="submit"
                  disabled={!isValid || loading}
                  variant="contained"
                  fullWidth
                  sx={{
                    mt: 1,
                    height: 56,
                    borderRadius: "999px",
                    textTransform: "none",
                    fontSize: 15,
                    fontWeight: 600,
                    boxShadow: "none",
                    background: `linear-gradient(90deg, ${teal} 0%, ${blue} 100%)`,
                    "&:hover": {
                      boxShadow: "none",
                      background: `linear-gradient(90deg, ${teal} 0%, ${blue} 100%)`,
                      filter: "brightness(1.03)",
                    },
                    "&.Mui-disabled": {
                      color: "rgba(255,255,255,0.75)",
                      background:
                        "linear-gradient(90deg, rgba(42,157,143,0.55) 0%, rgba(69,123,157,0.55) 100%)",
                    },
                  }}
                >
                  {loading ? "Validando..." : "Entrar"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 0.5 }}>
                  <Link
                    component="button"
                    type="button"
                    underline="none"
                    sx={{
                      fontSize: 13,
                      color: teal,
                      fontWeight: 600,
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* Footer centrado */}
          <Box sx={{ pt: 2, mt: 2, textAlign: "center" }}>
            <Typography
              variant="caption"
              sx={{
                color: mode === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.52)",
              }}
            >
              © 2026 AutiSense
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}