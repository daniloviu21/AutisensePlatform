import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DarkMode, LightMode, MarkEmailRead } from "@mui/icons-material";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useColorMode } from "../theme/ColorModeProvider";
import { useAuth } from "../auth/AuthContext";
import { http } from "../api/http";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Ingresa un código de 6 dígitos"),
});
type FormData = z.infer<typeof schema>;

type LocationState = {
  challengeId?: string;
  correo?: string;
};

export default function MfaPage() {
  const location = useLocation();
  const nav = useNavigate();
  const { mode, toggle } = useColorMode();
  const { completeMfaLogin } = useAuth() as any;

  const state = (location.state ?? {}) as LocationState;

  if (!state.challengeId || !state.correo) {
    return <Navigate to="/login" replace />;
  }

  const { challengeId, correo } = state;

  const [serverError, setServerError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [activeChallengeId, setActiveChallengeId] = useState(challengeId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setResendMsg(null);
    setLoading(true);

    try {
      const res = await http.post("/auth/mfa/verify", {
        challengeId: activeChallengeId,
        code: data.code,
      });

      completeMfaLogin(res.data);

      const user = res.data.user;
      if (user?.mustChangePassword) {
        nav("/cambiar-password", { replace: true });
      } else {
        nav("/dashboard", { replace: true });
      }
    } catch (e: any) {
      setServerError(
        e?.response?.data?.message ?? e?.message ?? "No se pudo verificar el código"
      );
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setServerError(null);
    setResendMsg(null);
    setResending(true);
    reset();

    try {
      const res = await http.post("/auth/mfa/resend", {
        challengeId: activeChallengeId,
      });
      setActiveChallengeId(res.data.challengeId);
      setResendMsg("Se envió un nuevo código a tu correo.");
    } catch (e: any) {
      setServerError(
        e?.response?.data?.message ?? "No se pudo reenviar el código. Intenta de nuevo."
      );
    } finally {
      setResending(false);
    }
  };

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
  const mutedText =
    mode === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.52)";
  const borderColor =
    mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(17,24,39,0.12)";

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
        }}
      >
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            position: "relative",
            overflow: "hidden",
            color: "#fff",
            background: leftBg,
            px: 7,
            py: 6,
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
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: 420,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: 420,
            }}
          >
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: "18px",
                background: "rgba(42,157,143,0.18)",
                border: "1px solid rgba(42,157,143,0.34)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 3.5,
              }}
            >
              <MarkEmailRead sx={{ color: teal, fontSize: 34 }} />
            </Box>

            <Typography
              sx={{
                fontSize: "clamp(2.8rem,4vw,4.2rem)",
                fontWeight: 300,
                lineHeight: 0.95,
                letterSpacing: "-0.055em",
                mb: 2.5,
              }}
            >
              Verificación
            </Typography>

            <Typography
              sx={{
                fontSize: "clamp(1rem,1.35vw,1.08rem)",
                color: "rgba(255,255,255,0.82)",
                maxWidth: 330,
                lineHeight: 1.7,
              }}
            >
              Enviamos un código de 6 dígitos a{" "}
              <Box component="span" sx={{ color: teal, fontWeight: 600 }}>
                {correo}
              </Box>
              . Revisa tu bandeja de entrada.
            </Typography>
          </Box>
        </Box>

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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
            <IconButton onClick={toggle} aria-label="toggle theme" size="small">
              {mode === "dark" ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
            <Box sx={{ width: "100%", maxWidth: 420, mx: "auto" }}>
              <Typography
                sx={{
                  fontSize: { xs: 32, md: 38 },
                  fontWeight: 300,
                  letterSpacing: "-0.04em",
                  color: textPrimary,
                  mb: 1,
                  textAlign: "center",
                }}
              >
                Ingresa tu código
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  color: mutedText,
                  mb: 4,
                }}
              >
                Expira en 10 minutos
              </Typography>

              {serverError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3 }}>
                  {serverError}
                </Alert>
              )}

              {resendMsg && (
                <Alert severity="success" sx={{ mb: 2.5, borderRadius: 3 }}>
                  {resendMsg}
                </Alert>
              )}

              <Stack component="form" spacing={2.2} onSubmit={handleSubmit(onSubmit)}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: teal,
                      mb: 1,
                      ml: 1.5,
                    }}
                  >
                    Código de 6 dígitos
                  </Typography>

                  <TextField
                    placeholder="123456"
                    fullWidth
                    {...register("code")}
                    error={!!errors.code}
                    helperText={errors.code?.message ?? " "}
                    inputProps={{
                      inputMode: "numeric",
                      maxLength: 6,
                      pattern: "[0-9]*",
                    }}
                    autoComplete="one-time-code"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        height: 60,
                        borderRadius: "999px",
                        bgcolor: inputBg,
                        overflow: "hidden",
                        "& fieldset": {
                          borderColor: errors.code ? "#d32f2f" : borderColor,
                          borderWidth: 1.5,
                        },
                        "&:hover fieldset": {
                          borderColor: errors.code ? "#d32f2f" : teal,
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: errors.code ? "#d32f2f" : teal,
                          borderWidth: 2,
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        textAlign: "center",
                        fontSize: 28,
                        fontWeight: 500,
                        letterSpacing: "0.35em",
                        padding: "0 20px",
                        fontFamily: "inherit",
                      },
                      "& .MuiFormHelperText-root": {
                        mx: 1.5,
                        minHeight: 20,
                      },
                    }}
                  />
                </Box>

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
                      filter: "brightness(1.03)",
                      background: `linear-gradient(90deg, ${teal} 0%, ${blue} 100%)`,
                    },
                    "&.Mui-disabled": {
                      color: "rgba(255,255,255,0.75)",
                      background:
                        "linear-gradient(90deg, rgba(42,157,143,0.55) 0%, rgba(69,123,157,0.55) 100%)",
                    },
                  }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Verificar"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 0.5 }}>
                  <Link
                    component="button"
                    type="button"
                    underline="none"
                    disabled={resending}
                    onClick={onResend}
                    sx={{
                      fontSize: 13,
                      color: teal,
                      fontWeight: 600,
                      opacity: resending ? 0.5 : 1,
                      cursor: resending ? "default" : "pointer",
                    }}
                  >
                    {resending ? "Enviando..." : "¿No recibiste el código? Reenviar"}
                  </Link>
                </Box>

                <Box sx={{ textAlign: "center" }}>
                  <Link
                    component="button"
                    type="button"
                    underline="none"
                    onClick={() => nav("/login", { replace: true })}
                    sx={{
                      fontSize: 13,
                      color: mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
                      fontWeight: 500,
                    }}
                  >
                    ← Volver al inicio de sesión
                  </Link>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Box sx={{ pt: 2, mt: 2, textAlign: "center" }}>
            <Typography
              variant="caption"
              sx={{
                color: mutedText,
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