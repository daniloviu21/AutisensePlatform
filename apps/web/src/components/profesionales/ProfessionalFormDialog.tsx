import {
  Alert,
  Avatar,
  Box,
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
import { useEffect, useMemo, useRef, useState } from "react";

export type ProfessionalStatus = "activo" | "suspendido" | "pendiente";

export type ClinicOption = {
  id: number;
  nombre: string;
  estado?: string;
};

export type ProfessionalFormValues = {
  id?: number;
  correo: string;
  password?: string;
  estado: ProfessionalStatus;
  clinicaId: number | null;

  nombre: string;
  ap_paterno: string;
  ap_materno: string;
  telefono: string;
  especialidad: string;
  organizacion: string;

  foto_url: string;
  foto_public_id: string;
};

type ExistingProfessionalLite = {
  id?: number;
  correo: string;
  nombre: string;
  ap_paterno: string;
  ap_materno?: string;
  telefono?: string;
  especialidad: string;
  clinicaId: number | null;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: ProfessionalFormValues | null;
  clinics?: ClinicOption[];
  existingProfessionals?: ExistingProfessionalLite[];
  submitting?: boolean;
  lockClinicId?: number | null;
  onClose: () => void;
  onSubmit: (
    values: ProfessionalFormValues,
    photoFile?: File | null
  ) => void | Promise<void>;
};

const steps = ["Cuenta", "Perfil profesional", "Foto y revisión"] as const;

const emptyForm: ProfessionalFormValues = {
  correo: "",
  password: "",
  estado: "activo",
  clinicaId: null,
  nombre: "",
  ap_paterno: "",
  ap_materno: "",
  telefono: "",
  especialidad: "",
  organizacion: "",
  foto_url: "",
  foto_public_id: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

export default function ProfessionalFormDialog({
  open,
  mode,
  initialData,
  clinics = [],
  existingProfessionals = [],
  submitting = false,
  lockClinicId = null,
  onClose,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = useState<ProfessionalFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setValues({
      ...(initialData ?? emptyForm),
      clinicaId:
        lockClinicId !== null && lockClinicId !== undefined
          ? lockClinicId
          : (initialData?.clinicaId ?? emptyForm.clinicaId),
      password: mode === "edit" ? "" : initialData?.password ?? "",
    });
    setErrors({});
    setActiveStep(0);
    setConfirmSubmitOpen(false);
    setConfirmDiscardOpen(false);
    setPhotoFile(null);
    setPhotoPreview(initialData?.foto_url ?? "");

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [open, initialData, mode, lockClinicId]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const normalizedValues = useMemo<ProfessionalFormValues>(() => {
    return {
      ...values,
      correo: normalizeEmail(values.correo),
      password: values.password?.trim() ?? "",
      clinicaId:
        lockClinicId !== null && lockClinicId !== undefined
          ? lockClinicId
          : values.clinicaId,
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      telefono: normalizePhone(values.telefono),
      especialidad: collapseSpaces(values.especialidad),
      organizacion: collapseSpaces(values.organizacion),
      foto_url: values.foto_url.trim(),
      foto_public_id: collapseSpaces(values.foto_public_id),
      estado: values.estado,
    };
  }, [values, lockClinicId]);

  const isDirty = useMemo(() => {
    const base = {
      ...(initialData ?? emptyForm),
      password: "",
      clinicaId:
        lockClinicId !== null && lockClinicId !== undefined
          ? lockClinicId
          : (initialData?.clinicaId ?? emptyForm.clinicaId),
    };

    return (
      JSON.stringify(normalizedValues) !==
        JSON.stringify({
          ...base,
          correo: normalizeEmail(base.correo),
          password: "",
          nombre: collapseSpaces(base.nombre),
          ap_paterno: collapseSpaces(base.ap_paterno),
          ap_materno: collapseSpaces(base.ap_materno),
          telefono: normalizePhone(base.telefono),
          especialidad: collapseSpaces(base.especialidad),
          organizacion: collapseSpaces(base.organizacion),
          foto_url: base.foto_url.trim(),
          foto_public_id: collapseSpaces(base.foto_public_id),
          estado: base.estado,
        }) || Boolean(photoFile)
    );
  }, [initialData, normalizedValues, lockClinicId, photoFile]);

  const duplicateChecks = useMemo(() => {
    const currentId = initialData?.id;

    const comparableCorreo = normalizedValues.correo;
    const comparableNombre = cleanComparable(
      `${normalizedValues.nombre} ${normalizedValues.ap_paterno} ${normalizedValues.ap_materno}`
    );
    const comparableTelefono = normalizedValues.telefono;

    const sameEmail = existingProfessionals.find(
      (item) => item.id !== currentId && normalizeEmail(item.correo) === comparableCorreo
    );

    const sameFullName = existingProfessionals.find((item) => {
      if (item.id === currentId) return false;

      const fullName = cleanComparable(
        `${item.nombre} ${item.ap_paterno} ${item.ap_materno ?? ""}`
      );

      const sameClinic = (item.clinicaId ?? null) === (normalizedValues.clinicaId ?? null);

      return Boolean(comparableNombre) && sameClinic && fullName === comparableNombre;
    });

    const samePhone = existingProfessionals.find(
      (item) =>
        item.id !== currentId &&
        normalizePhone(item.telefono ?? "") &&
        normalizePhone(item.telefono ?? "") === comparableTelefono
    );

    return {
      sameEmail,
      sameFullName,
      samePhone,
    };
  }, [existingProfessionals, initialData?.id, normalizedValues]);

  const validateField = (
    field: keyof ProfessionalFormValues,
    candidate = normalizedValues
  ) => {
    switch (field) {
      case "correo":
        if (!candidate.correo) return "El correo es obligatorio.";
        if (!EMAIL_REGEX.test(candidate.correo)) return "Ingresa un correo válido.";
        if (duplicateChecks.sameEmail) return "Ya existe un profesional con ese correo.";
        return "";

      case "password":
        if (mode === "create") {
          if (!candidate.password) return "La contraseña temporal es obligatoria.";
          if ((candidate.password?.length ?? 0) < 8) {
            return "La contraseña temporal debe tener al menos 8 caracteres.";
          }
          if ((candidate.password?.length ?? 0) > 72) {
            return "La contraseña temporal no debe exceder 72 caracteres.";
          }
        } else {
          const value = String(candidate.password ?? "");
          if (value.length > 0 && value.length < 8) {
            return "Si cambias la contraseña, debe tener al menos 8 caracteres.";
          }
          if (value.length > 72) {
            return "La contraseña no debe exceder 72 caracteres.";
          }
        }
        return "";

      case "clinicaId":
        if (!candidate.clinicaId) return "Selecciona una clínica.";
        return "";

      case "estado":
        if (!candidate.estado) return "Selecciona un estado.";
        return "";

      case "nombre":
        if (!candidate.nombre) return "El nombre es obligatorio.";
        if (candidate.nombre.length < 2) return "Debe tener al menos 2 caracteres.";
        if (candidate.nombre.length > 80) return "No debe exceder 80 caracteres.";
        return "";

      case "ap_paterno":
        if (!candidate.ap_paterno) return "El apellido paterno es obligatorio.";
        if (candidate.ap_paterno.length < 2) return "Debe tener al menos 2 caracteres.";
        if (candidate.ap_paterno.length > 80) return "No debe exceder 80 caracteres.";
        return "";

      case "ap_materno":
        if (candidate.ap_materno && candidate.ap_materno.length > 80) {
          return "No debe exceder 80 caracteres.";
        }
        return "";

      case "telefono":
        if (!candidate.telefono) return "El teléfono es obligatorio.";
        if (candidate.telefono.replace(/[^\d]/g, "").length < 10) {
          return "Ingresa un teléfono válido de al menos 10 dígitos.";
        }
        if (candidate.telefono.replace(/[^\d]/g, "").length > 15) {
          return "El teléfono no debe exceder 15 dígitos.";
        }
        return "";

      case "especialidad":
        if (!candidate.especialidad) return "La especialidad es obligatoria.";
        if (candidate.especialidad.length < 3) return "Debe tener al menos 3 caracteres.";
        if (candidate.especialidad.length > 80) return "No debe exceder 80 caracteres.";
        return "";

      case "organizacion":
        if (!candidate.organizacion) return "La organización es obligatoria.";
        if (candidate.organizacion.length < 2) return "Debe tener al menos 2 caracteres.";
        if (candidate.organizacion.length > 100) return "No debe exceder 100 caracteres.";
        return "";

      case "foto_url":
      case "foto_public_id":
        return "";

      default:
        return "";
    }
  };

  const validateStep = (stepIndex = activeStep) => {
    const fields =
      stepIndex === 0
        ? (["correo", "password", "clinicaId", "estado"] as Array<keyof ProfessionalFormValues>)
        : stepIndex === 1
        ? ([
            "nombre",
            "ap_paterno",
            "ap_materno",
            "telefono",
            "especialidad",
            "organizacion",
          ] as Array<keyof ProfessionalFormValues>)
        : ([] as Array<keyof ProfessionalFormValues>);

    const nextErrors: Record<string, string> = {};

    for (const field of fields) {
      const message = validateField(field);
      if (message) nextErrors[field] = message;
    }

    if (stepIndex === 1 && duplicateChecks.sameFullName) {
      nextErrors.nombre =
        "Ya existe un profesional con el mismo nombre completo en esta clínica.";
    }

    if (stepIndex === 1 && duplicateChecks.samePhone) {
      nextErrors.telefono = "Ya existe un profesional con ese teléfono.";
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const fields: Array<keyof ProfessionalFormValues> = [
      "correo",
      "password",
      "clinicaId",
      "estado",
      "nombre",
      "ap_paterno",
      "ap_materno",
      "telefono",
      "especialidad",
      "organizacion",
    ];

    const nextErrors: Record<string, string> = {};

    for (const field of fields) {
      const message = validateField(field);
      if (message) nextErrors[field] = message;
    }

    if (duplicateChecks.sameFullName) {
      nextErrors.nombre =
        "Ya existe un profesional con el mismo nombre completo en esta clínica.";
    }

    if (duplicateChecks.samePhone) {
      nextErrors.telefono = "Ya existe un profesional con ese teléfono.";
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((msg) => !msg);
  };

  const handleFieldChange = <K extends keyof ProfessionalFormValues>(
    field: K,
    value: ProfessionalFormValues[K]
  ) => {
    let nextValue = value;

    if (field === "telefono" && typeof value === "string") {
      nextValue = value.replace(/[^\d+\s()-]/g, "") as ProfessionalFormValues[K];
    }

    setValues((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleBlur = (field: keyof ProfessionalFormValues) => {
    const nextValues = {
      ...values,
      correo: normalizeEmail(values.correo),
      password: String(values.password ?? "").trim(),
      clinicaId:
        lockClinicId !== null && lockClinicId !== undefined ? lockClinicId : values.clinicaId,
      nombre: collapseSpaces(values.nombre),
      ap_paterno: collapseSpaces(values.ap_paterno),
      ap_materno: collapseSpaces(values.ap_materno),
      telefono: normalizePhone(values.telefono),
      especialidad: collapseSpaces(values.especialidad),
      organizacion: collapseSpaces(values.organizacion),
      foto_url: values.foto_url.trim(),
      foto_public_id: collapseSpaces(values.foto_public_id),
      estado: values.estado,
    };

    setValues(nextValues);
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, nextValues),
    }));
  };

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!file) {
      setPhotoPreview(values.foto_url || initialData?.foto_url || "");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPhotoPreview(objectUrl);
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
    if (activeStep < steps.length - 1) {
      const ok = validateStep(activeStep);
      if (!ok) return;
      setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }

    const nextValues = normalizedValues;
    setValues(nextValues);

    const ok = validateAll();
    if (!ok) return;

    setConfirmSubmitOpen(true);
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleConfirmedSubmit = async () => {
    setConfirmSubmitOpen(false);
    await onSubmit(normalizedValues, photoFile);
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
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mode === "create" ? "Nuevo profesional" : "Editar profesional"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info" variant="outlined">
              Los campos marcados con <strong>*</strong> son obligatorios.
            </Alert>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ width: "100%" }}
            >
              {steps.map((label, index) => {
                const active = index === activeStep;
                const done = index < activeStep;
                const last = index === steps.length - 1;

                return (
                  <Box
                    key={label}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ minWidth: "fit-content" }}
                    >
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          border: "1px solid",
                          borderColor: active || done ? "primary.main" : "divider",
                          bgcolor: active || done ? "primary.main" : "background.paper",
                          color: active || done ? "#fff" : "text.secondary",
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: active ? 700 : 500,
                          color: active ? "text.primary" : "text.secondary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </Typography>
                    </Stack>

                    {!last && (
                      <Box
                        sx={{
                          flex: 1,
                          height: 1,
                          mx: 2,
                          bgcolor: done ? "primary.main" : "divider",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>

            {activeStep === 0 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    required
                    label="Correo"
                    value={values.correo}
                    onChange={(e) => handleFieldChange("correo", e.target.value)}
                    onBlur={() => handleBlur("correo")}
                    error={!!errors.correo}
                    helperText={errors.correo || " "}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Estado"
                    value={values.estado}
                    onChange={(e) =>
                      handleFieldChange("estado", e.target.value as ProfessionalStatus)
                    }
                    onBlur={() => handleBlur("estado")}
                    error={!!errors.estado}
                    helperText={errors.estado || " "}
                  >
                    <MenuItem value="activo">Activo</MenuItem>
                    <MenuItem value="pendiente">Pendiente</MenuItem>
                    <MenuItem value="suspendido">Suspendido</MenuItem>
                  </TextField>
                </Grid>

                {mode === "create" && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Contraseña temporal"
                      type="password"
                      value={values.password ?? ""}
                      onChange={(e) => handleFieldChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      error={!!errors.password}
                      helperText={errors.password || " "}
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, md: mode === "create" ? 6 : 12 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Clínica"
                    value={values.clinicaId ?? ""}
                    onChange={(e) =>
                      handleFieldChange(
                        "clinicaId",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    onBlur={() => handleBlur("clinicaId")}
                    error={!!errors.clinicaId}
                    helperText={errors.clinicaId || " "}
                    disabled={lockClinicId !== null && lockClinicId !== undefined}
                  >
                    {clinics.map((clinic) => (
                      <MenuItem key={clinic.id} value={clinic.id}>
                        {clinic.nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    required
                    label="Nombre"
                    value={values.nombre}
                    onChange={(e) => handleFieldChange("nombre", e.target.value)}
                    onBlur={() => handleBlur("nombre")}
                    error={!!errors.nombre}
                    helperText={errors.nombre || " "}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Apellido paterno"
                    value={values.ap_paterno}
                    onChange={(e) => handleFieldChange("ap_paterno", e.target.value)}
                    onBlur={() => handleBlur("ap_paterno")}
                    error={!!errors.ap_paterno}
                    helperText={errors.ap_paterno || " "}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Apellido materno"
                    value={values.ap_materno}
                    onChange={(e) => handleFieldChange("ap_materno", e.target.value)}
                    onBlur={() => handleBlur("ap_materno")}
                    error={!!errors.ap_materno}
                    helperText={errors.ap_materno || " "}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Teléfono"
                    value={values.telefono}
                    onChange={(e) => handleFieldChange("telefono", e.target.value)}
                    onBlur={() => handleBlur("telefono")}
                    error={!!errors.telefono}
                    helperText={errors.telefono || " "}
                    inputProps={{ inputMode: "tel", maxLength: 18 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Especialidad"
                    value={values.especialidad}
                    onChange={(e) => handleFieldChange("especialidad", e.target.value)}
                    onBlur={() => handleBlur("especialidad")}
                    error={!!errors.especialidad}
                    helperText={errors.especialidad || " "}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    required
                    label="Organización"
                    value={values.organizacion}
                    onChange={(e) => handleFieldChange("organizacion", e.target.value)}
                    onBlur={() => handleBlur("organizacion")}
                    error={!!errors.organizacion}
                    helperText={errors.organizacion || " "}
                  />
                </Grid>

                {(duplicateChecks.sameFullName || duplicateChecks.samePhone) && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="warning" variant="outlined">
                      Revisa posibles duplicados antes de continuar.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}

            {activeStep === 2 && (
            <Stack spacing={2}>
                <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                >
                <Avatar
                    src={photoPreview || undefined}
                    sx={{
                    width: 84,
                    height: 84,
                    fontSize: 28,
                    fontWeight: 700,
                    bgcolor:
                        theme.palette.mode === "dark"
                        ? "rgba(42,157,143,0.18)"
                        : "rgba(42,157,143,0.14)",
                    color: "primary.main",
                    }}
                >
                    {values.nombre?.charAt(0)?.toUpperCase() ?? "P"}
                </Avatar>

                <Stack spacing={1}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" component="label" disabled={submitting}>
                        Subir imagen
                        <input
                        hidden
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                        />
                    </Button>

                    {(photoPreview || photoFile) && (
                        <Button
                        variant="text"
                        color="inherit"
                        disabled={submitting}
                        onClick={() => {
                            handlePhotoChange(null);
                            setValues((prev) => ({
                            ...prev,
                            foto_url: "",
                            foto_public_id: "",
                            }));
                        }}
                        >
                        Quitar imagen
                        </Button>
                    )}
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                    JPG, PNG o WEBP. Máximo 5 MB.
                    </Typography>
                </Stack>
                </Stack>

                <Alert severity="info" variant="outlined">
                Revisa la información antes de guardar. El alta creará la cuenta de acceso y el
                perfil profesional enlazado.
                </Alert>

                <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Cuenta
                    </Typography>
                    <Stack spacing={0.75}>
                    <Typography variant="body2">
                        <strong>Correo:</strong> {normalizedValues.correo || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Estado:</strong> {normalizedValues.estado || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Clínica:</strong> {selectedClinicName}
                    </Typography>
                    </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                    Perfil
                    </Typography>
                    <Stack spacing={0.75}>
                    <Typography variant="body2">
                        <strong>Nombre:</strong>{" "}
                        {[
                        normalizedValues.nombre,
                        normalizedValues.ap_paterno,
                        normalizedValues.ap_materno,
                        ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Teléfono:</strong> {normalizedValues.telefono || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Especialidad:</strong> {normalizedValues.especialidad || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Organización:</strong> {normalizedValues.organizacion || "—"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Foto:</strong>{" "}
                        {photoFile
                        ? photoFile.name
                        : normalizedValues.foto_url
                        ? "Imagen actual"
                        : "Sin imagen"}
                    </Typography>
                    </Stack>
                </Grid>
                </Grid>
            </Stack>
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

            {activeStep > 0 && (
              <Button onClick={handleBack} variant="outlined" color="inherit" disabled={submitting}>
                Atrás
              </Button>
            )}

            <Button onClick={handlePrimaryAction} variant="contained" disabled={submitting}>
              {submitting
                ? "Guardando..."
                : activeStep < steps.length - 1
                ? "Siguiente"
                : mode === "create"
                ? "Crear profesional"
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
          {mode === "create" ? "Confirmar alta de profesional" : "Confirmar cambios"}
        </DialogTitle>

        <DialogContent>
          <Typography color="text.secondary">
            {mode === "create"
              ? "Se registrará el profesional con la cuenta y el perfil capturados."
              : "Se actualizarán los datos del profesional."}
          </Typography>

          <Stack spacing={0.75} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Correo:</strong> {normalizedValues.correo}
            </Typography>
            <Typography variant="body2">
              <strong>Estado:</strong> {normalizedValues.estado}
            </Typography>
            <Typography variant="body2">
              <strong>Clínica:</strong> {selectedClinicName}
            </Typography>
            <Typography variant="body2">
              <strong>Nombre:</strong>{" "}
              {[normalizedValues.nombre, normalizedValues.ap_paterno, normalizedValues.ap_materno]
                .filter(Boolean)
                .join(" ")}
            </Typography>
            <Typography variant="body2">
              <strong>Especialidad:</strong> {normalizedValues.especialidad || "—"}
            </Typography>
            <Typography variant="body2">
            <strong>Foto:</strong>{" "}
            {photoFile
                ? photoFile.name
                : normalizedValues.foto_url
                ? "Imagen actual"
                : "Sin imagen"}
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