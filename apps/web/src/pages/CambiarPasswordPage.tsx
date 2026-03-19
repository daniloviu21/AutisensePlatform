import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { http } from "../api/http";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";

function getErrorMessage(error: unknown, fallback: string) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error as { message?: string })?.message;

  return typeof message === "string" && message.trim() ? message : fallback;
}

export default function CambiarPasswordPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data } = await http.post("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      setSuccessMessage("Contraseña actualizada correctamente.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "No se pudo actualizar la contraseña.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Cambio obligatorio de contraseña"
      subtitle="Antes de continuar, actualiza tu contraseña temporal."
      hideSidebar
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 560,
          mx: "auto",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={2.5}>
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />

          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            helperText="Debe tener entre 8 y 72 caracteres."
          />

          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />

          <Box>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={
                submitting ||
                !currentPassword.trim() ||
                !newPassword.trim() ||
                !confirmPassword.trim()
              }
              sx={{ textTransform: "none", borderRadius: 2, minWidth: 220 }}
            >
              {submitting ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Esta validación protege el acceso inicial cuando la cuenta fue creada por la clínica.
          </Typography>
        </Stack>
      </Paper>
    </AdminLayout>
  );
}