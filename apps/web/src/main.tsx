import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ColorModeProvider } from "./theme/ColorModeProvider";

import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import MfaPage from "./pages/MfaPage";

function ClinicasPage() {
  return <div>Clinicas</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ColorModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Splash -> luego redirige a /login */}
            <Route path="/" element={<SplashPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/mfa" element={<MfaPage />} />

            <Route
              path="/clinicas"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <ClinicasPage />
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