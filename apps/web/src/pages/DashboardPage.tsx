import { Box, Paper, Stack, Typography } from "@mui/material";
import AdminLayout from "../layout/AdminLayout";

export default function DashboardPage() {
  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Resumen general del sistema"
    >
      <Stack spacing={2}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            minHeight: 180,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>
            Panel inicial
          </Typography>
          <Typography color="text.secondary">
            Aquí irán los indicadores, actividad reciente y accesos rápidos.
          </Typography>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
            gap: 16,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minHeight: 220,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
              Actividad reciente
            </Typography>
            <Typography color="text.secondary">
              Sin información por el momento.
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              minHeight: 220,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>
              Estado del sistema
            </Typography>
            <Typography color="text.secondary">
              Sin información por el momento.
            </Typography>
          </Paper>
        </Box>
      </Stack>
    </AdminLayout>
  );
}