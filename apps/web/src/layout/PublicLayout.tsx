import { Box, Container, Stack, Typography, Button, IconButton } from "@mui/material";
import { ScienceOutlined, DarkMode, LightMode } from "@mui/icons-material";
import { Link, Outlet } from "react-router-dom";
import { useColorMode } from "../theme/ColorModeProvider";

export default function PublicLayout() {
  const { mode, toggle } = useColorMode();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* Header Simple */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: 4,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1100,
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          component={Link}
          to="/"
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          <Typography variant="h6" fontWeight="800" sx={{ color: "primary.main", letterSpacing: "-0.5px" }}>
            AutiSense
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={toggle} color="inherit" size="small">
            {mode === "dark" ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
          </IconButton>
          <Button component={Link} to="/login" variant="text" color="inherit">
            Iniciar Sesión
          </Button>
          <Button component={Link} to="/planes" variant="contained">
            Ver Planes
          </Button>
        </Stack>
      </Box>

      {/* Contenido Principal */}
      <Box component="main" sx={{ flexGrow: 1, py: 6 }}>
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>

      {/* Footer Simple */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: 4,
          borderTop: "1px solid",
          borderColor: "divider",
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} AutiSense Platform. Todos los derechos reservados.
        </Typography>
      </Box>
    </Box>
  );
}
