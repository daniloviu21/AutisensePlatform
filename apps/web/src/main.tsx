import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function LoginPage() {
  return <div>Login</div>;
}
function ClinicasPage() {
  return <div>Clinicas</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/clinicas"
            element={
              <ProtectedRoute roles={["super_admin"]}>
                <ClinicasPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/clinicas" replace />} />
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);