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

export type ClinicStatus = "activa" | "suspendida";

export type ClinicFormValues = {
  id?: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  telefono: string;
  correo_contacto: string;
  direccion: string;
  estado: ClinicStatus;
};

type ExistingClinicLite = {
  id?: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  correo_contacto: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: ClinicFormValues | null;
  existingClinics?: ExistingClinicLite[];
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ClinicFormValues) => void | Promise<void>;
};

const emptyForm: ClinicFormValues = {
  nombre: "",
  razon_social: "",
  rfc: "",
  telefono: "",
  correo_contacto: "",
  direccion: "",
  estado: "suspendida",
};

const RFC_REGEX = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRFC(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function cleanComparable(value: string) {
  return collapseSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ClinicFormDialog({
  open,
  mode,
  initialData,
  existingClinics = [],
  submitting = false,
  onClose,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = useState<ClinicFormValues>(emptyForm);
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

  const normalizedValues = useMemo<ClinicFormValues>(() => {
    return {
      ...values,
      nombre: collapseSpaces(values.nombre),
      razon_social: collapseSpaces(values.razon_social),
      rfc: normalizeRFC(values.rfc),
      telefono: normalizePhone(values.telefono),
      correo_contacto: normalizeEmail(values.correo_contacto),
      direccion: collapseSpaces(values.direccion),
      estado: values.estado,
    };
  }, [values]);

  const isDirty = useMemo(() => {
    const base = initialData ?? emptyForm;

    return JSON.stringify(normalizedValues) !== JSON.stringify({
      ...base,
      nombre: collapseSpaces(base.nombre),
      razon_social: collapseSpaces(base.razon_social),
      rfc: normalizeRFC(base.rfc),
      telefono: normalizePhone(base.telefono),
      correo_contacto: normalizeEmail(base.correo_contacto),
      direccion: collapseSpaces(base.direccion),
      estado: base.estado,
    });
  }, [initialData, normalizedValues]);

  const duplicateChecks = useMemo(() => {
    const currentId = initialData?.id;

    const comparableNombre = cleanComparable(normalizedValues.nombre);
    const comparableRazon = cleanComparable(normalizedValues.razon_social);
    const comparableRfc = normalizedValues.rfc;
    const comparableEmail = normalizedValues.correo_contacto;

    const sameName = existingClinics.find(
      (clinic) =>
        clinic.id !== currentId &&
        cleanComparable(clinic.nombre) === comparableNombre
    );

    const sameRFC = existingClinics.find(
      (clinic) => clinic.id !== currentId && normalizeRFC(clinic.rfc) === comparableRfc
    );

    const sameEmail = existingClinics.find(
      (clinic) =>
        clinic.id !== currentId &&
        normalizeEmail(clinic.correo_contacto) === comparableEmail
    );

    const suspiciousNameRazon =
      comparableNombre &&
      comparableRazon &&
      comparableNombre === comparableRazon;

    return {
      sameName,
      sameRFC,
      sameEmail,
      suspiciousNameRazon,
    };
  }, [existingClinics, initialData?.id, normalizedValues]);

  const validateField = (field: keyof ClinicFormValues, current: ClinicFormValues) => {
    switch (field) {
      case "nombre": {
        const value = collapseSpaces(current.nombre);
        if (!value) return "El nombre comercial es obligatorio";
        if (value.length < 3) return "Debe tener al menos 3 caracteres";
        if (value.length > 120) return "No puede exceder 120 caracteres";
        if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value)) return "Debe incluir al menos una letra";
        if (/^[\d\s]+$/.test(value)) return "No puede contener solo números";
        if (duplicateChecks.sameName) return "Ya existe una clínica con un nombre muy similar";
        return "";
      }

      case "razon_social": {
        const value = collapseSpaces(current.razon_social);
        if (!value) return "La razón social es obligatoria";
        if (value.length < 3) return "Debe tener al menos 3 caracteres";
        if (value.length > 180) return "No puede exceder 180 caracteres";
        if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value)) return "Debe incluir al menos una letra";
        return "";
      }

      case "rfc": {
        const value = normalizeRFC(current.rfc);
        if (!value) return "El RFC es obligatorio";
        if (!(value.length === 12 || value.length === 13))
          return "El RFC debe tener 12 o 13 caracteres";
        if (!RFC_REGEX.test(value)) return "El RFC no tiene un formato válido";
        if (duplicateChecks.sameRFC) return "Ya existe una clínica con este RFC";
        return "";
      }

      case "telefono": {
        const raw = current.telefono.trim();
        const digitsOnly = raw.replace(/\D/g, "");
        if (!raw) return "El teléfono es obligatorio";
        if (digitsOnly.length < 10 || digitsOnly.length > 15)
          return "Debe contener entre 10 y 15 dígitos";
        return "";
      }

      case "correo_contacto": {
        const value = normalizeEmail(current.correo_contacto);
        if (!value) return "El correo de contacto es obligatorio";
        if (value.length > 254) return "El correo es demasiado largo";
        if (!EMAIL_REGEX.test(value)) return "Ingresa un correo válido";
        if (duplicateChecks.sameEmail) return "Ya existe un registro con este correo";
        return "";
      }

      case "direccion": {
        const value = collapseSpaces(current.direccion);
        if (!value) return "La dirección es obligatoria";
        if (value.length < 10) return "La dirección parece incompleta";
        if (value.length > 300) return "La dirección no puede exceder 300 caracteres";
        return "";
      }

      case "estado":
        if (!current.estado) return "Selecciona un estado inicial";
        return "";

      default:
        return "";
    }
  };

  const validateAll = (current: ClinicFormValues) => {
    const next: Record<string, string> = {
      nombre: validateField("nombre", current),
      razon_social: validateField("razon_social", current),
      rfc: validateField("rfc", current),
      telefono: validateField("telefono", current),
      correo_contacto: validateField("correo_contacto", current),
      direccion: validateField("direccion", current),
      estado: validateField("estado", current),
    };

    if (duplicateChecks.suspiciousNameRazon) {
      next.razon_social =
        next.razon_social || "La razón social no debería ser igual al nombre comercial";
    }

    setErrors(next);
    return Object.values(next).every((msg) => !msg);
  };

  const setField = (name: keyof ClinicFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field: keyof ClinicFormValues) => {
    const nextValues = {
      ...values,
      nombre: collapseSpaces(values.nombre),
      razon_social: collapseSpaces(values.razon_social),
      rfc: normalizeRFC(values.rfc),
      telefono: normalizePhone(values.telefono),
      correo_contacto: normalizeEmail(values.correo_contacto),
      direccion: collapseSpaces(values.direccion),
    };

    setValues(nextValues);
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, nextValues),
    }));
  };

  const handlePhoneChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    setField("telefono", cleaned);
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E"].includes(e.key)) {
      e.preventDefault();
    }
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
          {mode === "create" ? "Nueva clínica" : "Editar clínica"}
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
                  label="Nombre comercial"
                  value={values.nombre}
                  onChange={(e) => setField("nombre", e.target.value)}
                  onBlur={() => handleBlur("nombre")}
                  error={!!errors.nombre}
                  helperText={errors.nombre || " "}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Razón social"
                  value={values.razon_social}
                  onChange={(e) => setField("razon_social", e.target.value)}
                  onBlur={() => handleBlur("razon_social")}
                  error={!!errors.razon_social}
                  helperText={errors.razon_social || " "}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="RFC"
                  value={values.rfc}
                  onChange={(e) => setField("rfc", e.target.value.toUpperCase())}
                  onBlur={() => handleBlur("rfc")}
                  error={!!errors.rfc}
                  helperText={errors.rfc || " "}
                  inputProps={{ maxLength: 13 }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  required
                  label="Teléfono"
                  value={values.telefono}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={handlePhoneKeyDown}
                  onBlur={() => handleBlur("telefono")}
                  error={!!errors.telefono}
                  helperText={errors.telefono || " "}
                  inputProps={{
                    inputMode: "numeric",
                    maxLength: 15,
                    pattern: "[0-9+]*",
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Estado inicial"
                  value={values.estado}
                  onChange={(e) => setField("estado", e.target.value)}
                  onBlur={() => handleBlur("estado")}
                  error={!!errors.estado}
                  helperText={errors.estado || " "}
                >
                  <MenuItem value="suspendida">Suspendida</MenuItem>
                  <MenuItem value="activa">Activa</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Correo de contacto"
                  value={values.correo_contacto}
                  onChange={(e) => setField("correo_contacto", e.target.value)}
                  onBlur={() => handleBlur("correo_contacto")}
                  error={!!errors.correo_contacto}
                  helperText={errors.correo_contacto || " "}
                  inputProps={{ maxLength: 254 }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Dirección"
                  multiline
                  minRows={3}
                  value={values.direccion}
                  onChange={(e) => setField("direccion", e.target.value)}
                  onBlur={() => handleBlur("direccion")}
                  error={!!errors.direccion}
                  helperText={errors.direccion || " "}
                  inputProps={{ maxLength: 300 }}
                />
              </Grid>
            </Grid>

            {duplicateChecks.suspiciousNameRazon && !errors.razon_social ? (
              <Alert severity="warning" variant="outlined">
                El nombre comercial y la razón social se ven iguales. Revisa si eso es correcto.
              </Alert>
            ) : null}
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
                ? "Crear clínica"
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
          {mode === "create" ? "Confirmar alta de clínica" : "Confirmar cambios"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            {mode === "create"
              ? "Se registrará la clínica con los datos capturados."
              : "Se actualizarán los datos de la clínica."}
          </Typography>
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