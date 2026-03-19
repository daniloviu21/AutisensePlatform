import { Box, Stack } from "@mui/material";
import AdminLayout from "../layout/AdminLayout";
import { useAuth } from "../auth/AuthContext";
import DashboardKpiCards from "../components/dashboard/DashboardKpiCards";
import { GrowthChart, DistributionChart } from "../components/dashboard/DashboardCharts";
import DashboardRecentActivity from "../components/dashboard/DashboardRecentActivity";
import {
  superAdminMockData,
  clinicAdminMockData,
  profesionalMockData,
  tutorMockData,
} from "../components/dashboard/dashboard.mock";

export default function DashboardPage() {
  const { user } = useAuth();

  // Selección de datos mock según el rol
  const getMockData = () => {
    switch (user?.role) {
      case "super_admin":
        return superAdminMockData;
      case "clinic_admin":
        return clinicAdminMockData;
      case "profesional":
        return profesionalMockData;
      case "tutor":
        return tutorMockData;
      default:
        return profesionalMockData; // fallback
    }
  };

  const getSubtitle = () => {
    switch (user?.role) {
      case "super_admin": return "Resumen general del sistema y métricas globales.";
      case "clinic_admin": return "Métricas y actividad operativa de tu clínica.";
      case "profesional": return "Resumen de pacientes, gestión de turnos y actividad.";
      case "tutor": return "Seguimiento y progreso terapéutico.";
      default: return "Resumen general";
    }
  };

  const getGrowthTitle = () => {
    switch (user?.role) {
      case "super_admin": return "Crecimiento Anual (Plataforma)";
      case "clinic_admin": return "Atenciones vs Cancelaciones Semanales";
      case "profesional": return "Evolución de Sesiones Mensuales";
      case "tutor": return "Cumplimiento de Objetivos Terapéuticos";
      default: return "Evolución";
    }
  };

  const getDistributionTitle = () => {
    switch (user?.role) {
      case "super_admin": return "Distribución por Diagnóstico Global";
      case "clinic_admin": return "Distribución por Especialidad (Clínica)";
      case "profesional": return "Modalidad de Atención";
      case "tutor": return "Estado de Objetivos Actuales";
      default: return "Distribución";
    }
  };

  const data = getMockData();

  return (
    <AdminLayout
      title="Dashboard"
      subtitle={getSubtitle()}
    >
      <Stack spacing={3} sx={{ pb: 4 }}>
        {/* Top KPIs */}
        <DashboardKpiCards kpis={data.kpis} />

        {/* Charts Section */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2fr 1.2fr" },
            gap: 3,
            minHeight: 380,
          }}
        >
          <Box sx={{ minHeight: 380 }}>
            <GrowthChart
              title={getGrowthTitle()}
              categories={data.growthChart.categories}
              series={data.growthChart.series}
            />
          </Box>
          <Box sx={{ minHeight: 380 }}>
            <DistributionChart
              title={getDistributionTitle()}
              data={data.distributionChart}
            />
          </Box>
        </Box>

        {/* Bottom Section */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", xl: "1fr" },
            gap: 3,
            minHeight: 280,
          }}
        >
          <DashboardRecentActivity items={data.recentActivity} />
        </Box>
      </Stack>
    </AdminLayout>
  );
}