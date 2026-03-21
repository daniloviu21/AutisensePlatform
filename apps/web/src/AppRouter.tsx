import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import MfaPage from "./pages/MfaPage";
import DashboardPage from "./pages/DashboardPage";
import ClinicasPage from "./pages/ClinicasPage";
import UsuariosPage from "./pages/UsuariosPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import CambiarPasswordPage from "./pages/CambiarPasswordPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import PacientesPage from "./pages/PacientesPage";
import TutoresPage from "./pages/TutoresPage";
import LogsPage from "./pages/LogsPage";

function PlaceholderPage({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title}</div>;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<SplashPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa" element={<MfaPage />} />

      {/* Cambio de contraseña obligatorio */}
      <Route
        path="/cambiar-password"
        element={
          <ProtectedRoute>
            <CambiarPasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin", "profesional", "tutor"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* super_admin + clinic_admin */}
      <Route
        path="/clinicas"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin"]}>
            <ClinicasPage />
          </ProtectedRoute>
        }
      />
      {/* super_admin + clinic_admin */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin"]}>
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suscripciones"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin"]}>
            <PlaceholderPage title="Suscripciones" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/logs"
        element={
          <ProtectedRoute roles={["super_admin"]}>
            <LogsPage />
          </ProtectedRoute>
        }
      />

      {/* super_admin + clinic_admin */}
      <Route
        path="/profesionales"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin"]}>
            <ProfesionalesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutores"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin", "profesional"]}>
            <TutoresPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pacientes"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin", "profesional"]}>
            <PacientesPage />
          </ProtectedRoute>
        }
      />

      {/* Todos los roles autenticados */}
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute roles={["super_admin", "clinic_admin", "profesional", "tutor"]}>
            <ConfiguracionPage />
          </ProtectedRoute>
        }
      />

      {/* Fallbacks */}
      <Route path="/unauthorized" element={<div>Sin permiso</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
