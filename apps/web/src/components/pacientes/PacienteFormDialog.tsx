import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { blockInvalidNameCharsOnKeyDown } from "../../utils/inputSanitizers";

export type PacienteStatus = "activo" | "inactivo";
export type PacienteSexo = "M" | "F";
export type ClinicOption = { id: number; nombre: string; estado: string };

export type PacienteFormValues = {
  nombre: string;
  ap_paterno: string;
  ap_materno: string;
  fecha_nacimiento: string;
  sexo: PacienteSexo;
  clinicaId: number | null;
  estado: PacienteStatus;
  diagnostico_presuntivo: string;
  antecedentes_relevantes: string;
  notas_generales: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  defaultValues?: Partial<PacienteFormValues>;
  clinics: ClinicOption[];
  submitting: boolean;
  onClose: () => void;
  onSave: (values: PacienteFormValues) => Promise<void>;
};

const EMPTY_FORM: PacienteFormValues = {
  nombre: "",
  ap_paterno: "",
  ap_materno: "",
  fecha_nacimiento: "",
  sexo: "M",
  clinicaId: null,
  estado: "activo",
  diagnostico_presuntivo: "",
  antecedentes_relevantes: "",
  notas_generales: "",
};

const SEXO_OPTIONS: Array<{ value: PacienteSexo; label: string }> = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];


function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function a11yProps(index: number) {
  return {
    id: `paciente-form-tab-${index}`,
    "aria-controls": `paciente-form-tabpanel-${index}`,
  };
}

function TabLabel({ label, hasError }: { label: string; hasError: boolean }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <span>{label}</span>
      {hasError ? (
        <Typography
          component="span"
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "error.main",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ) : null}
    </Stack>
  );
}

export default function PacienteFormDialog({
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

  const [values, setValues] = useState<PacienteFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const isClinicLocked = user?.role !== "super_admin";
  const lockedClinicId = isClinicLocked ? (user?.clinicId ?? null) : null;

  useEffect(() => {
    if (!open) return;

    setValues({
      ...EMPTY_FORM,
      clinicaId: lockedClinicId,
      ...defaultValues,
    });
    setErrors({});
    setTab(0);
    setConfirmSubmitOpen(false);
    setConfirmDiscardOpen(false);
  }, [open, defaultValues, lockedClinicId]);

  const normalizedValues = useMemo<PacienteFormValues>(() => {
    return {
      ...values,
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      diagnostico_presuntivo: collapseSpaces(values.diagnostico_presuntivo),
      antecedentes_relevantes: collapseSpaces(values.antecedentes_relevantes),
      notas_generales: collapseSpaces(values.notas_generales),
      clinicaId: lockedClinicId ?? values.clinicaId,
    };
  }, [values, lockedClinicId]);

  const isDirty = useMemo(() => {
    const base: PacienteFormValues = {
      ...EMPTY_FORM,
      clinicaId: lockedClinicId,
      ...defaultValues,
    };

    const normalizedBase: PacienteFormValues = {
      ...base,
      nombre: collapseSpaces(base.nombre),
      ap_paterno: collapseSpaces(base.ap_paterno),
      ap_materno: collapseSpaces(base.ap_materno),
      diagnostico_presuntivo: collapseSpaces(base.diagnostico_presuntivo),
      antecedentes_relevantes: collapseSpaces(base.antecedentes_relevantes),
      notas_generales: collapseSpaces(base.notas_generales),
      clinicaId: lockedClinicId ?? base.clinicaId,
    };

    return JSON.stringify(normalizedValues) !== JSON.stringify(normalizedBase);
  }, [defaultValues, lockedClinicId, normalizedValues]);

  const validateField = (
    field: keyof PacienteFormValues,
    current: PacienteFormValues
  ): string => {
    switch (field) {
      case "nombre": {
        const value = collapseSpaces(current.nombre);
        if (!value) return "El nombre es obligatorio";
        if (value.length < 2) return "Debe tener al menos 2 caracteres";
        if (value.length > 80) return "No puede exceder 80 caracteres";
        if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value)) return "Debe incluir al menos una letra";
        return "";
      }

      case "ap_paterno": {
        const value = collapseSpaces(current.ap_paterno);
        if (!value) return "El apellido paterno es obligatorio";
        if (value.length < 2) return "Debe tener al menos 2 caracteres";
        if (value.length > 80) return "No puede exceder 80 caracteres";
        if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(value)) return "Debe incluir al menos una letra";
        return "";
      }

      case "ap_materno": {
        const value = collapseSpaces(current.ap_materno);
        if (value.length > 80) return "No puede exceder 80 caracteres";
        return "";
      }

      case "fecha_nacimiento": {
        const value = current.fecha_nacimiento;
        if (!value) return "La fecha de nacimiento es obligatoria";
        if (!isValidDate(value)) return "Ingresa una fecha válida";

        const date = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (date > today) return "La fecha no puede ser futura";

        const minDate = new Date("1900-01-01");
        if (date < minDate) return "La fecha parece inválida";

        return "";
      }

      case "sexo":
        if (!current.sexo) return "Selecciona una opción";
        if (!["M", "F"].includes(current.sexo)) return "Selecciona una opción válida";
        return "";

      case "clinicaId": {
        if (isClinicLocked) return "";
        if (current.clinicaId === null || Number.isNaN(Number(current.clinicaId))) {
          return "Selecciona una clínica";
        }
        return "";
      }

      case "estado":
        if (!current.estado) return "Selecciona un estado";
        return "";

      case "diagnostico_presuntivo": {
        const value = collapseSpaces(current.diagnostico_presuntivo);
        if (value.length > 500) return "No puede exceder 500 caracteres";
        return "";
      }

      case "antecedentes_relevantes": {
        const value = collapseSpaces(current.antecedentes_relevantes);
        if (value.length > 2000) return "No puede exceder 2000 caracteres";
        return "";
      }

      case "notas_generales": {
        const value = collapseSpaces(current.notas_generales);
        if (value.length > 2000) return "No puede exceder 2000 caracteres";
        return "";
      }

      default:
        return "";
    }
  };

  const validateAll = (current: PacienteFormValues) => {
    const next: Record<string, string> = {
      nombre: validateField("nombre", current),
      ap_paterno: validateField("ap_paterno", current),
      ap_materno: validateField("ap_materno", current),
      fecha_nacimiento: validateField("fecha_nacimiento", current),
      sexo: validateField("sexo", current),
      clinicaId: validateField("clinicaId", current),
      estado: validateField("estado", current),
      diagnostico_presuntivo: validateField("diagnostico_presuntivo", current),
      antecedentes_relevantes: validateField("antecedentes_relevantes", current),
      notas_generales: validateField("notas_generales", current),
    };

    setErrors(next);
    return Object.values(next).every((msg) => !msg);
  };

  const setField = (
    field: keyof PacienteFormValues,
    value: string | number | null
  ) => {
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

  const handleBlur = (field: keyof PacienteFormValues) => {
    const nextValues: PacienteFormValues = {
      ...values,
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      diagnostico_presuntivo: collapseSpaces(values.diagnostico_presuntivo),
      antecedentes_relevantes: collapseSpaces(values.antecedentes_relevantes),
      notas_generales: collapseSpaces(values.notas_generales),
      clinicaId: lockedClinicId ?? values.clinicaId,
    };

    setValues(nextValues);
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, nextValues),
    }));
  };

  const personalHasErrors = Boolean(
    errors.nombre ||
    errors.ap_paterno ||
    errors.ap_materno ||
    errors.fecha_nacimiento ||
    errors.sexo ||
    errors.clinicaId ||
    errors.estado
  );

  const clinicalHasErrors = Boolean(
    errors.diagnostico_presuntivo ||
    errors.antecedentes_relevantes ||
    errors.notas_generales
  );

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
    if (!ok) {
      if (personalHasErrors) {
        setTab(0);
      } else if (clinicalHasErrors) {
        setTab(1);
      }
      return;
    }

    setConfirmSubmitOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setConfirmSubmitOpen(false);

    const payload: PacienteFormValues = {
      ...normalizedValues,
      clinicaId: lockedClinicId ?? normalizedValues.clinicaId,
    };

    await onSave(payload);
  };

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
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mode === "create" ? "Nuevo paciente" : "Editar paciente"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Los campos marcados con <strong>*</strong> son obligatorios.
            </Alert>

            <Tabs
              value={tab}
              onChange={(_, nextTab: number) => setTab(nextTab)}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  minHeight: 44,
                },
              }}
            >
              <Tab
                label={<TabLabel label="Datos personales" hasError={personalHasErrors && tab !== 0} />}
                {...a11yProps(0)}
              />
              <Tab
                label={<TabLabel label="Datos clínicos" hasError={clinicalHasErrors && tab !== 1} />}
                {...a11yProps(1)}
              />
            </Tabs>

            {/* TAB 0 */}
            <Box hidden={tab !== 0}>
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
                    Identificación
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
                      onKeyDown={blockInvalidNameCharsOnKeyDown}
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
                      onKeyDown={blockInvalidNameCharsOnKeyDown}
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
                      onKeyDown={blockInvalidNameCharsOnKeyDown}
                      error={!!errors.ap_materno}
                      helperText={errors.ap_materno || " "}
                      inputProps={{ maxLength: 80, autoCapitalize: "words" }}
                    />
                  </Box>
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
                    Datos demográficos
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
                      label="Fecha de nacimiento"
                      type="date"
                      value={values.fecha_nacimiento}
                      onChange={(e) => setField("fecha_nacimiento", e.target.value)}
                      onBlur={() => handleBlur("fecha_nacimiento")}
                      error={!!errors.fecha_nacimiento}
                      helperText={errors.fecha_nacimiento || " "}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: new Date().toISOString().slice(0, 10) }}
                    />

                    <TextField
                      select
                      fullWidth
                      required
                      label="Sexo"
                      value={values.sexo}
                      onChange={(e) =>
                        setField("sexo", e.target.value as PacienteSexo)
                      }
                      onBlur={() => handleBlur("sexo")}
                      error={!!errors.sexo}
                      helperText={errors.sexo || " "}
                    >
                      {SEXO_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
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
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: !isClinicLocked ? "1fr 1fr" : "1fr",
                      },
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
                          setField(
                            "clinicaId",
                            e.target.value === "" ? null : Number(e.target.value)
                          )
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
                      onChange={(e) =>
                        setField("estado", e.target.value as PacienteStatus)
                      }
                      onBlur={() => handleBlur("estado")}
                      error={!!errors.estado}
                      helperText={errors.estado || " "}
                    >
                      <MenuItem value="activo">Activo</MenuItem>
                      <MenuItem value="inactivo">Inactivo</MenuItem>
                    </TextField>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            {/* TAB 1 */}
            <Box hidden={tab !== 1}>
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
                    Impresión diagnóstica inicial
                  </Typography>

                  <TextField
                    fullWidth
                    label="Diagnóstico presuntivo"
                    multiline
                    minRows={3}
                    maxRows={5}
                    value={values.diagnostico_presuntivo}
                    onChange={(e) => setField("diagnostico_presuntivo", e.target.value)}
                    onBlur={() => handleBlur("diagnostico_presuntivo")}
                    error={!!errors.diagnostico_presuntivo}
                    helperText={
                      errors.diagnostico_presuntivo ||
                      "Ej: TEA nivel 2, retraso del lenguaje, evaluación en proceso"
                    }
                    inputProps={{ maxLength: 500 }}
                    placeholder="Describe el diagnóstico inicial o presuntivo..."
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
                    Historial clínico
                  </Typography>

                  <TextField
                    fullWidth
                    label="Antecedentes relevantes"
                    multiline
                    minRows={4}
                    maxRows={7}
                    value={values.antecedentes_relevantes}
                    onChange={(e) => setField("antecedentes_relevantes", e.target.value)}
                    onBlur={() => handleBlur("antecedentes_relevantes")}
                    error={!!errors.antecedentes_relevantes}
                    helperText={
                      errors.antecedentes_relevantes ||
                      "Antecedentes perinatales, familiares, médicos o de desarrollo"
                    }
                    inputProps={{ maxLength: 2000 }}
                    placeholder="Describe antecedentes médicos, familiares o de desarrollo relevantes..."
                  />

                  <TextField
                    fullWidth
                    label="Notas generales"
                    multiline
                    minRows={4}
                    maxRows={7}
                    value={values.notas_generales}
                    onChange={(e) => setField("notas_generales", e.target.value)}
                    onBlur={() => handleBlur("notas_generales")}
                    error={!!errors.notas_generales}
                    helperText={
                      errors.notas_generales ||
                      "Observaciones adicionales para el expediente"
                    }
                    inputProps={{ maxLength: 2000 }}
                    placeholder="Agrega observaciones clínicas o notas internas relevantes..."
                  />
                </Stack>
              </Stack>
            </Box>

            {tab === 1 && (
              <Alert severity="info" variant="outlined">
                Revisa la información antes de guardar.
              </Alert>
            )}
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
                  ? "Crear paciente"
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
          {mode === "create" ? "Confirmar alta de paciente" : "Confirmar cambios"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            {mode === "create"
              ? "Se registrará el paciente con la información capturada."
              : "Se actualizarán los datos del paciente."}
          </Typography>

          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Nombre:</strong>{" "}
              {[normalizedValues.nombre, normalizedValues.ap_paterno, normalizedValues.ap_materno]
                .filter(Boolean)
                .join(" ")}
            </Typography>
            <Typography variant="body2">
              <strong>Fecha de nacimiento:</strong> {normalizedValues.fecha_nacimiento || "—"}
            </Typography>
            <Typography variant="body2">
              <strong>Sexo:</strong>{" "}
              {normalizedValues.sexo === "M"
                ? "Masculino"
                : normalizedValues.sexo === "F"
                  ? "Femenino"
                  : "Otro"}
            </Typography>
            <Typography variant="body2">
              <strong>Clínica:</strong> {clinicaActual}
            </Typography>
            <Typography variant="body2">
              <strong>Estado:</strong>{" "}
              {normalizedValues.estado === "activo" ? "Activo" : "Inactivo"}
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