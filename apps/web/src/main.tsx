import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ColorModeProvider } from "./theme/ColorModeProvider";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import MfaPage from "./pages/MfaPage";
import DashboardPage from "./pages/DashboardPage";
import ClinicasPage from "./pages/ClinicasPage";
import UsuariosPage from "./pages/UsuariosPage";

function PlaceholderPage({ title }: { title: string }) {
  return <div style={{ padding: 24 }}>{title}</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mfa" element={<MfaPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/clinicas"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <ClinicasPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/usuarios"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <UsuariosPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profesionales"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <PlaceholderPage title="Profesionales" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tutores"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <PlaceholderPage title="Tutores" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/pacientes"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <PlaceholderPage title="Pacientes" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/suscripciones"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <PlaceholderPage title="Suscripciones" />
                </ProtectedRoute>
              }
            />

            <Route path="/unauthorized" element={<div>Sin permiso</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ColorModeProvider>
  </React.StrictMode>
);