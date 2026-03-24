import { Box, Typography, Grid, Card, CardContent, Button, Stack, List, ListItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { CheckCircleOutline, StarOutline } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const PLANES = [
  {
    id: "mensual",
    nombre: "Plan Mensual",
    precio: 999,
    moneda: "MXN",
    periodo: "mes",
    descripcion: "Ideal para clínicas pequeñas que inician su digitalización.",
    beneficios: [
      "Hasta 50 pacientes",
      "Análisis de video ilimitado (simulado)",
      "Reportes básicos",
      "Soporte por correo",
    ],
    color: "#2563EB",
  },
  {
    id: "anual",
    nombre: "Plan Anual",
    precio: 9990,
    moneda: "MXN",
    periodo: "año",
    descripcion: "Ahorra 2 meses con el pago anual. El favorito de las clínicas.",
    beneficios: [
      "Pacientes ilimitados",
      "Análisis de video ilimitado (simulado)",
      "Reportes avanzados",
      "Soporte prioritario",
      "2 meses gratis incluidos",
    ],
    color: "#10B981",
    destacado: true,
  },
  {
    id: "pro_mensual",
    nombre: "Plan Pro Mensual",
    precio: 1499,
    moneda: "MXN",
    periodo: "mes",
    descripcion: "Para centros especializados con múltiples profesionales.",
    beneficios: [
      "Pacientes ilimitados",
      "Múltiples sedes/clínicas",
      "Exportación de datos RAW",
      "Consultoría personalizada",
    ],
    color: "#8B5CF6",
  },
];

export default function PlanesPage() {
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    navigate(`/checkout?plan=${planId}`);
  };

  return (
    <Box>
      <Stack spacing={2} textAlign="center" mb={8} alignItems="center">
        <Typography variant="h3" fontWeight="900" gutterBottom>
          Planes y Suscripciones
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800 }}>
          Elige el plan que mejor se adapte a las necesidades de tu clínica y comienza a transformar el diagnóstico clínico con IA.
        </Typography>
      </Stack>

      <Grid 
        container 
        spacing={3} 
        justifyContent="center" 
        alignItems="stretch"
        sx={{ width: "100%", m: 0 }}
      >
        {PLANES.map((plan) => (
          <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                borderRadius: 4,
                border: plan.destacado ? "2px solid" : "1px solid",
                borderColor: plan.destacado ? "primary.main" : "divider",
                boxShadow: plan.destacado ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" : "none",
                transform: plan.destacado ? "scale(1.05)" : "none",
                zIndex: plan.destacado ? 1 : 0,
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: plan.destacado ? "scale(1.08)" : "translateY(-8px)",
                },
              }}
            >
              {plan.destacado && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    bgcolor: "primary.main",
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <StarOutline fontSize="small" />
                  <Typography variant="caption" fontWeight="bold">RECOMENDADO</Typography>
                </Box>
              )}

              <CardContent sx={{ p: 4, flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="overline" fontWeight="700" color="text.secondary" gutterBottom>
                  {plan.id.toUpperCase()}
                </Typography>
                <Typography variant="h5" fontWeight="800" mb={1}>
                  {plan.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3} sx={{ minHeight: 40 }}>
                  {plan.descripcion}
                </Typography>

                <Box sx={{ mb: 4, display: "flex", alignItems: "baseline" }}>
                  <Typography variant="h3" fontWeight="900" color="text.primary">
                    ${plan.precio.toLocaleString()}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                    {plan.moneda} / {plan.periodo}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 4 }} />

                <List sx={{ mb: 4, flexGrow: 1 }}>
                  {plan.beneficios.map((beneficio, index) => (
                    <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleOutline sx={{ color: plan.color, fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={beneficio}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  variant={plan.destacado ? "contained" : "outlined"}
                  fullWidth
                  size="large"
                  onClick={() => handleSelectPlan(plan.id)}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                    ...(plan.destacado && {
                      boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
                    }),
                  }}
                >
                  Comprar ahora
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
