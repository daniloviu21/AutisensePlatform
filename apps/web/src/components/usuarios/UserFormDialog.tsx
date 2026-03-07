import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

export type UserRole = "super_admin" | "clinic_admin" | "profesional" | "tutor";
export type UserStatus = "activo" | "suspendido" | "pendiente";

export type ClinicOption = {
  id: number;
  nombre: string;
  estado?: string;
};

export type UserFormValues = {
  id?: number;
  correo: string;
  password?: string;
  role: UserRole;
  estado: UserStatus;
  clinicaId: number | null;
};

type ExistingUserLite = {
  id?: number;
  correo: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: UserFormValues | null;
  existingUsers?: ExistingUserLite[];
  clinics?: ClinicOption[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
};

const emptyForm: UserFormValues = {
  correo: "",
  password: "",
  role: "clinic_admin",
  estado: "activo",
  clinicaId: null,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export default function UserFormDialog({
  open,
  mode,
  initialData,
  existingUsers = [],
  clinics = [],
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = useState<UserFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialData ?? emptyForm);
      setErrors({});
      setConfirmSubmitOpen(false);
      setConfirmDiscardOpen(false);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (values.role === "super_admin" && values.clinicaId !== null) {
      setValues((prev) => ({ ...prev, clinicaId: null }));
    }
  }, [values.role, values.clinicaId]);

  const normalizedValues = useMemo<UserFormValues>(() => {
    return {
      ...values,
      correo: normalizeEmail(values.correo),
      clinicaId: values.role === "super_admin" ? null : values.clinicaId,
    };
  }, [values]);

  const isDirty = useMemo(() => {
    const base = initialData ?? emptyForm;
    return JSON.stringify(normalizedValues) !== JSON.stringify({
      ...base,
      correo: normalizeEmail(base.correo),
      clinicaId: base.role === "super_admin" ? null : base.clinicaId,
    });
  }, [initialData, normalizedValues]);

  const validateField = (field: keyof UserFormValues, current: UserFormValues) => {
    switch (field) {
      case "correo": {
        const value = normalizeEmail(current.correo);
        if (!value) return "El correo es obligatorio";
        if (!EMAIL_REGEX.test(value)) return "Ingresa un correo válido";

        const duplicate = existingUsers.find(
          (u) => u.id !== current.id && normalizeEmail(u.correo) === value
        );
        if (duplicate) return "Ya existe un usuario con ese correo";
        return "";
      }

      case "password": {
        if (mode === "create") {
          const value = String(current.password ?? "");
          if (!value) return "La contraseña temporal es obligatoria";
          if (value.length < 8) return "Debe tener al menos 8 caracteres";
          if (value.length > 72) return "No puede exceder 72 caracteres";
        } else {
          const value = String(current.password ?? "");
          if (value.length > 0 && value.length < 8) {
            return "Si cambias la contraseña, debe tener al menos 8 caracteres";
          }
          if (value.length > 72) return "No puede exceder 72 caracteres";
        }
        return "";
      }

      case "role": {
        if (!current.role) return "Selecciona un rol";
        return "";
      }

      case "estado": {
        if (!current.estado) return "Selecciona un estado";
        return "";
      }

      case "clinicaId": {
        if (current.role === "super_admin") return "";
        if (current.clinicaId === null || Number.isNaN(Number(current.clinicaId))) {
          return "Selecciona una clínica";
        }
        return "";
      }

      default:
        return "";
    }
  };

  const validateAll = (current: UserFormValues) => {
    const next: Record<string, string> = {
      correo: validateField("correo", current),
      password: validateField("password", current),
      role: validateField("role", current),
      estado: validateField("estado", current),
      clinicaId: validateField("clinicaId", current),
    };

    setErrors(next);
    return Object.values(next).every((msg) => !msg);
  };

  const setField = (name: keyof UserFormValues, value: string | number | null) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (field: keyof UserFormValues) => {
    const nextValues = {
      ...values,
      correo: normalizeEmail(values.correo),
      clinicaId: values.role === "super_admin" ? null : values.clinicaId,
    };

    setValues(nextValues);
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, nextValues),
    }));
  };

  const requestClose = () => {
    if (submitting) return;

    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }

    onClose();
  };

  const handlePrimaryAction = () => {
    const nextValues = normalizedValues;
    setValues(nextValues);

    const ok = validateAll(nextValues);
    if (!ok) return;

    setConfirmSubmitOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setConfirmSubmitOpen(false);
    await onSubmit(normalizedValues);
  };

  const selectedClinicName =
    normalizedValues.clinicaId == null
      ? "Sin clínica"
      : clinics.find((c) => c.id === normalizedValues.clinicaId)?.nombre ?? "Sin clínica";

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Los campos marcados con <strong>*</strong> son obligatorios.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Correo"
                  value={values.correo}
                  onChange={(e) => setField("correo", e.target.value)}
                  onBlur={() => handleBlur("correo")}
                  error={!!errors.correo}
                  helperText={errors.correo || " "}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required={mode === "create"}
                  label={mode === "create" ? "Contraseña temporal" : "Nueva contraseña"}
                  type="password"
                  value={values.password ?? ""}
                  onChange={(e) => setField("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  error={!!errors.password}
                  helperText={errors.password || " "}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Rol"
                  value={values.role}
                  onChange={(e) => setField("role", e.target.value)}
                  onBlur={() => handleBlur("role")}
                  error={!!errors.role}
                  helperText={errors.role || " "}
                >
                  <MenuItem value="super_admin">Super admin</MenuItem>
                  <MenuItem value="clinic_admin">Admin de clínica</MenuItem>
                  <MenuItem value="profesional">Profesional</MenuItem>
                  <MenuItem value="tutor">Tutor</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Estado"
                  value={values.estado}
                  onChange={(e) => setField("estado", e.target.value)}
                  onBlur={() => handleBlur("estado")}
                  error={!!errors.estado}
                  helperText={errors.estado || " "}
                >
                  <MenuItem value="activo">Activo</MenuItem>
                  <MenuItem value="pendiente">Pendiente</MenuItem>
                  <MenuItem value="suspendido">Suspendido</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  required={values.role !== "super_admin"}
                  label="Clínica"
                  value={values.clinicaId ?? ""}
                  onChange={(e) =>
                    setField(
                      "clinicaId",
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  onBlur={() => handleBlur("clinicaId")}
                  error={!!errors.clinicaId}
                  helperText={errors.clinicaId || " "}
                  disabled={values.role === "super_admin"}
                >
                  {values.role === "super_admin" ? (
                    <MenuItem value="">No aplica</MenuItem>
                  ) : (
                    clinics.map((clinic) => (
                      <MenuItem key={clinic.id} value={clinic.id}>
                        {clinic.nombre}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.25}>
            <Button
              onClick={requestClose}
              variant="outlined"
              color="inherit"
              disabled={submitting}
            >
              Cancelar
            </Button>

            <Button
              onClick={handlePrimaryAction}
              variant="contained"
              disabled={submitting}
            >
              {submitting
                ? "Guardando..."
                : mode === "create"
                ? "Crear usuario"
                : "Guardar cambios"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmSubmitOpen}
        onClose={() => !submitting && setConfirmSubmitOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mode === "create" ? "Confirmar alta de usuario" : "Confirmar cambios"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            {mode === "create"
              ? "Se registrará el usuario con los datos capturados."
              : "Se actualizarán los datos del usuario."}
          </Typography>

          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Correo:</strong> {normalizedValues.correo}
            </Typography>
            <Typography variant="body2">
              <strong>Rol:</strong> {normalizedValues.role}
            </Typography>
            <Typography variant="body2">
              <strong>Estado:</strong> {normalizedValues.estado}
            </Typography>
            <Typography variant="body2">
              <strong>Clínica:</strong> {selectedClinicName}
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmSubmitOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={submitting}
          >
            Volver
          </Button>
          <Button
            onClick={handleConfirmedSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting
              ? "Procesando..."
              : mode === "create"
              ? "Confirmar alta"
              : "Confirmar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDiscardOpen}
        onClose={() => !submitting && setConfirmDiscardOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Descartar cambios</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            Tienes cambios sin guardar. Si sales ahora, se perderán.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmDiscardOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={submitting}
          >
            Seguir editando
          </Button>
          <Button
            onClick={() => {
              setConfirmDiscardOpen(false);
              onClose();
            }}
            color="error"
            variant="contained"
            disabled={submitting}
          >
            Salir sin guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}