import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";

export type TutorStatus = "activo" | "suspendido" | "pendiente";
export type ClinicOption = { id: number; nombre: string; estado: string };

export type TutorFormValues = {
  correo: string;
  password: string;
  estado: TutorStatus;
  clinicaId: number | null;
  nombre: string;
  ap_paterno: string;
  ap_materno: string;
  telefono: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  defaultValues?: Partial<TutorFormValues>;
  clinics: ClinicOption[];
  submitting: boolean;
  onClose: () => void;
  onSave: (values: TutorFormValues) => Promise<void>;
};

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function collapseSpaces(v: string) {
  return v.replace(/\s+/g, " ").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,30}$/;

const EMPTY_FORM: TutorFormValues = {
  correo: "",
  password: "",
  estado: "activo",
  clinicaId: null,
  nombre: "",
  ap_paterno: "",
  ap_materno: "",
  telefono: "",
};

const STATUS_OPTIONS: Array<{ value: TutorStatus; label: string }> = [
  { value: "activo", label: "Activo" },
  { value: "suspendido", label: "Suspendido" },
  { value: "pendiente", label: "Pendiente" },
];

export default function TutorFormDialog({
  open,
  mode,
  defaultValues,
  clinics,
  submitting,
  onClose,
  onSave,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const isClinicLocked = user?.role !== "super_admin";
  const lockedClinicId = isClinicLocked ? (user?.clinicId ?? null) : null;

  const [values, setValues] = useState<TutorFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    setValues({
      ...EMPTY_FORM,
      clinicaId: lockedClinicId,
      ...defaultValues,
    });
    setErrors({});
    setConfirmOpen(false);
    setDiscardOpen(false);
  }, [open, defaultValues, lockedClinicId]);

  const normalizedValues = useMemo<TutorFormValues>(
    () => ({
      ...values,
      correo: normalizeEmail(values.correo),
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      telefono: collapseSpaces(values.telefono),
      clinicaId: lockedClinicId ?? values.clinicaId,
    }),
    [values, lockedClinicId]
  );

  const isDirty = useMemo(() => {
    const base: TutorFormValues = {
      ...EMPTY_FORM,
      clinicaId: lockedClinicId,
      ...defaultValues,
    };

    const normalizedBase: TutorFormValues = {
      ...base,
      correo: normalizeEmail(base.correo),
      nombre: collapseSpaces(base.nombre),
      ap_paterno: collapseSpaces(base.ap_paterno),
      ap_materno: collapseSpaces(base.ap_materno),
      telefono: collapseSpaces(base.telefono),
      clinicaId: lockedClinicId ?? base.clinicaId,
    };

    return JSON.stringify(normalizedValues) !== JSON.stringify(normalizedBase);
  }, [defaultValues, lockedClinicId, normalizedValues]);

  const validateField = (field: keyof TutorFormValues, current: TutorFormValues): string => {
    switch (field) {
      case "correo": {
        const v = normalizeEmail(current.correo);
        if (!v) return "El correo es obligatorio";
        if (!EMAIL_RE.test(v)) return "Ingresa un correo válido";
        if (v.length > 254) return "El correo es demasiado largo";
        return "";
      }

      case "password": {
        if (mode !== "create") return "";
        if (!current.password) return "La contraseña temporal es obligatoria";
        if (current.password.length < 8) return "Debe tener al menos 8 caracteres";
        if (current.password.length > 72) return "No puede exceder 72 caracteres";
        return "";
      }

      case "nombre": {
        const v = collapseSpaces(current.nombre);
        if (!v) return "El nombre es obligatorio";
        if (v.length < 2) return "Debe tener al menos 2 caracteres";
        if (v.length > 80) return "No puede exceder 80 caracteres";
        return "";
      }

      case "ap_paterno": {
        const v = collapseSpaces(current.ap_paterno);
        if (!v) return "El apellido paterno es obligatorio";
        if (v.length < 2) return "Debe tener al menos 2 caracteres";
        if (v.length > 80) return "No puede exceder 80 caracteres";
        return "";
      }

      case "ap_materno": {
        const v = collapseSpaces(current.ap_materno);
        if (v.length > 80) return "No puede exceder 80 caracteres";
        return "";
      }

      case "telefono": {
        const v = collapseSpaces(current.telefono);
        if (v && !PHONE_RE.test(v)) return "Ingresa un teléfono válido";
        return "";
      }

      case "clinicaId": {
        if (isClinicLocked) return "";
        if (current.clinicaId === null || !Number.isFinite(Number(current.clinicaId))) {
          return "Selecciona una clínica";
        }
        return "";
      }

      case "estado": {
        if (!["activo", "suspendido", "pendiente"].includes(current.estado)) {
          return "Selecciona un estado válido";
        }
        return "";
      }

      default:
        return "";
    }
  };

  const validateAll = (current: TutorFormValues) => {
    const fields: Array<keyof TutorFormValues> = [
      "correo",
      "password",
      "nombre",
      "ap_paterno",
      "ap_materno",
      "telefono",
      "clinicaId",
      "estado",
    ];

    const next: Record<string, string> = {};
    for (const field of fields) {
      next[field] = validateField(field, current);
    }

    setErrors(next);
    return Object.values(next).every((msg) => !msg);
  };

  const setField = (field: keyof TutorFormValues, value: string | number | null) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleBlur = (field: keyof TutorFormValues) => {
    const next: TutorFormValues = {
      ...values,
      correo: normalizeEmail(values.correo),
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      telefono: collapseSpaces(values.telefono),
      clinicaId: lockedClinicId ?? values.clinicaId,
    };

    setValues(next);
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, next),
    }));
  };

  const requestClose = () => {
    if (submitting) return;

    if (isDirty) {
      setDiscardOpen(true);
      return;
    }

    onClose();
  };

  const handlePrimaryAction = () => {
    const next = normalizedValues;
    setValues(next);

    const ok = validateAll(next);
    if (!ok) return;

    setConfirmOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setConfirmOpen(false);
    await onSave(normalizedValues);
  };

  const statusInfo = useMemo(() => {
    if (normalizedValues.estado === "activo") {
      return { label: "Activo", color: "#0F766E" };
    }
    if (normalizedValues.estado === "pendiente") {
      return { label: "Pendiente", color: "#9A3412" };
    }
    return { label: "Suspendido", color: "#B91C1C" };
  }, [normalizedValues.estado]);

  const clinicaActual =
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
          {mode === "create" ? "Nuevo tutor" : "Editar tutor"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Los campos marcados con <strong>*</strong> son obligatorios.
            </Alert>

            <Stack spacing={2.5}>
              <Stack spacing={1.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Datos personales
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 2,
                  }}
                >
                  <TextField
                    fullWidth
                    required
                    label="Nombre(s)"
                    value={values.nombre}
                    onChange={(e) => setField("nombre", e.target.value)}
                    onBlur={() => handleBlur("nombre")}
                    error={!!errors.nombre}
                    helperText={errors.nombre || " "}
                    inputProps={{ maxLength: 80, autoCapitalize: "words" }}
                  />

                  <TextField
                    fullWidth
                    required
                    label="Apellido paterno"
                    value={values.ap_paterno}
                    onChange={(e) => setField("ap_paterno", e.target.value)}
                    onBlur={() => handleBlur("ap_paterno")}
                    error={!!errors.ap_paterno}
                    helperText={errors.ap_paterno || " "}
                    inputProps={{ maxLength: 80, autoCapitalize: "words" }}
                  />

                  <TextField
                    fullWidth
                    label="Apellido materno"
                    value={values.ap_materno}
                    onChange={(e) => setField("ap_materno", e.target.value)}
                    onBlur={() => handleBlur("ap_materno")}
                    error={!!errors.ap_materno}
                    helperText={errors.ap_materno || " "}
                    inputProps={{ maxLength: 80, autoCapitalize: "words" }}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Teléfono"
                  value={values.telefono}
                  onChange={(e) => setField("telefono", e.target.value)}
                  onBlur={() => handleBlur("telefono")}
                  error={!!errors.telefono}
                  helperText={errors.telefono || " "}
                  inputProps={{ maxLength: 30 }}
                />
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Acceso
                </Typography>

                <TextField
                  fullWidth
                  required
                  label="Correo electrónico"
                  value={values.correo}
                  onChange={(e) => setField("correo", e.target.value)}
                  onBlur={() => handleBlur("correo")}
                  error={!!errors.correo}
                  helperText={errors.correo || " "}
                  inputProps={{ maxLength: 254, autoComplete: "email" }}
                />

                {mode === "create" && (
                  <TextField
                    fullWidth
                    required
                    label="Contraseña temporal"
                    type="password"
                    value={values.password}
                    onChange={(e) => setField("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    error={!!errors.password}
                    helperText={errors.password || "El tutor deberá cambiarla en su primer acceso."}
                    inputProps={{ maxLength: 72, autoComplete: "new-password" }}
                  />
                )}
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800,
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Configuración
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: !isClinicLocked ? "1fr 1fr" : "1fr" },
                    gap: 2,
                  }}
                >
                  {!isClinicLocked && (
                    <TextField
                      select
                      fullWidth
                      required
                      label="Clínica"
                      value={values.clinicaId ?? ""}
                      onChange={(e) =>
                        setField("clinicaId", e.target.value === "" ? null : Number(e.target.value))
                      }
                      onBlur={() => handleBlur("clinicaId")}
                      error={!!errors.clinicaId}
                      helperText={errors.clinicaId || " "}
                    >
                      <MenuItem value="" disabled>
                        Selecciona una clínica
                      </MenuItem>
                      {clinics.map((clinic) => (
                        <MenuItem key={clinic.id} value={clinic.id}>
                          {clinic.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <TextField
                    select
                    fullWidth
                    label="Estado"
                    value={values.estado}
                    onChange={(e) => setField("estado", e.target.value as TutorStatus)}
                    onBlur={() => handleBlur("estado")}
                    error={!!errors.estado}
                    helperText={errors.estado || " "}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Stack direction="row" spacing={1.25}>
            <Button onClick={requestClose} variant="outlined" color="inherit" disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handlePrimaryAction} variant="contained" disabled={submitting}>
              {submitting
                ? "Guardando..."
                : mode === "create"
                  ? "Crear tutor"
                  : "Guardar cambios"}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mode === "create" ? "Confirmar alta de tutor" : "Confirmar cambios"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary" gutterBottom>
            {mode === "create"
              ? "Se registrará el tutor con la información capturada."
              : "Se actualizarán los datos del tutor."}
          </Typography>

          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Nombre:</strong>{" "}
              {[normalizedValues.nombre, normalizedValues.ap_paterno, normalizedValues.ap_materno]
                .filter(Boolean)
                .join(" ")}
            </Typography>
            <Typography variant="body2">
              <strong>Correo:</strong> {normalizedValues.correo || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Clínica:</strong> {clinicaActual}
            </Typography>
            <Typography variant="body2">
              <strong>Estado:</strong>{" "}
              <Chip
                label={statusInfo.label}
                size="small"
                sx={{ fontWeight: 700, color: statusInfo.color, ml: 0.5 }}
              />
            </Typography>
            {mode === "create" && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                El tutor deberá cambiar su contraseña temporal en el primer acceso.
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={submitting}
          >
            Volver
          </Button>
          <Button onClick={handleConfirmedSubmit} variant="contained" disabled={submitting}>
            {submitting
              ? "Procesando..."
              : mode === "create"
                ? "Confirmar alta"
                : "Confirmar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={discardOpen}
        onClose={() => !submitting && setDiscardOpen(false)}
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
            onClick={() => setDiscardOpen(false)}
            variant="outlined"
            color="inherit"
            disabled={submitting}
          >
            Seguir editando
          </Button>
          <Button
            onClick={() => {
              setDiscardOpen(false);
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