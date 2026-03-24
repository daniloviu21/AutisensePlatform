import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { PersonOutline, EventNoteOutlined } from "@mui/icons-material";
import { http } from "../../api/http";

export type EncuentroData = {
  pacienteId: number | "";
  tipoEncuentro: string;
  fecha: string;
  motivo: string;
  contexto: string;
};

type PacienteOption = {
  id: number;
  nombre: string;
  ap_paterno: string;
};

type Props = {
  value: EncuentroData;
  onChange: (data: EncuentroData) => void;
};

export default function AnalisisEncuentroForm({ value, onChange }: Props) {
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedOption, setSelectedOption] = useState<PacienteOption | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      async function loadPacientes() {
        try {
          setLoading(true);
          const res = await http.get("/pacientes", {
            params: { page: 1, pageSize: 50, estado: "activo", q: inputValue },
          });
          setPacientes(res.data.items || []);
        } catch (err) {
          console.error("Error cargando pacientes", err);
        } finally {
          setLoading(false);
        }
      }
      loadPacientes();
    }, 400);

    return () => clearTimeout(handler);
  }, [inputValue]);

  const handleChange = (field: keyof EncuentroData, val: string | number) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
          <EventNoteOutlined color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Datos del Encuentro
          </Typography>
        </Stack>

        <Stack spacing={3}>
          <FormControl fullWidth>
            <Autocomplete<PacienteOption>
              options={pacientes}
              getOptionLabel={(option: PacienteOption) => `${option.nombre} ${option.ap_paterno}`}
              value={selectedOption}
              onChange={(_: any, newValue: PacienteOption | null) => {
                setSelectedOption(newValue);
                handleChange("pacienteId", newValue ? newValue.id : "");
              }}
              inputValue={inputValue}
              onInputChange={(_: any, newInputValue: string) => {
                setInputValue(newInputValue);
              }}
              loading={loading}
              noOptionsText="No se encontraron pacientes"
              filterOptions={(x: PacienteOption[]) => x} // Disable local filtering, rely on backend
              isOptionEqualToValue={(option: PacienteOption, val: PacienteOption) => option.id === val.id}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Paciente *"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <PersonOutline sx={{ ml: 1, mr: 0.5, color: "text.secondary" }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </FormControl>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="tipo-lbl">Tipo de encuentro</InputLabel>
              <Select
                labelId="tipo-lbl"
                label="Tipo de encuentro"
                value={value.tipoEncuentro}
                onChange={(e) => handleChange("tipoEncuentro", e.target.value)}
              >
                <MenuItem value="consulta">Consulta presencial</MenuItem>
                <MenuItem value="sesion">Sesión terapéutica</MenuItem>
                <MenuItem value="seguimiento">Seguimiento</MenuItem>
                <MenuItem value="llamada">Llamada / Asesoría</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Fecha"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={value.fecha}
              onChange={(e) => handleChange("fecha", e.target.value)}
            />
          </Stack>

          <TextField
            fullWidth
            label="Motivo o foco de observación"
            placeholder="Ej. Análisis de contacto visual y estereotipias"
            value={value.motivo}
            onChange={(e) => handleChange("motivo", e.target.value)}
          />

          <TextField
            fullWidth
            label="Contexto clínico (opcional)"
            multiline
            rows={3}
            placeholder="Anotaciones relevantes sobre el estado previo del infante..."
            value={value.contexto}
            onChange={(e) => handleChange("contexto", e.target.value)}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
