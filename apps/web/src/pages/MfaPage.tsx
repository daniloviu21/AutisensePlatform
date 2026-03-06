import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Ingresa un código de 6 dígitos"),
});
type FormData = z.infer<typeof schema>;

export default function MfaPage() {
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = async (_: FormData) => {
    alert("MFA pendiente de implementar en backend");
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Verificación</Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, mt: 1 }}>
            Ingresa el código de 6 dígitos enviado a tu correo.
          </Typography>

          <Stack component="form" spacing={2} sx={{ mt: 3 }} onSubmit={handleSubmit(onSubmit)}>
            <TextField
              label="Código"
              placeholder="123456"
              {...register("code")}
              error={!!errors.code}
              helperText={errors.code?.message ?? " "}
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
            />
            <Button type="submit" variant="contained" disabled={!isValid}>
              Verificar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}