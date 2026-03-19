import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { http, registerUserRefreshCallback } from "../api/http";

export type UserRole = "super_admin" | "clinic_admin" | "profesional" | "tutor";

type User = {
  id: number;
  correo: string;
  role: UserRole;
  clinicId: number | null;
  mustChangePassword: boolean;
};

/** Resultado posible de login() */
export type LoginResult =
  | { requiresMfa: true; challengeId: string }
  | { requiresMfa: false }
  | undefined;

type AuthState = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (correo: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as User) : null;
  });

  // Registra setUser para que el interceptor Axios pueda actualizar React state
  // tras un refresh silencioso de access token
  useEffect(() => {
    registerUserRefreshCallback((refreshedUser) => {
      setUser(refreshedUser as User);
    });
  }, []);

  const login = async (correo: string, password: string): Promise<LoginResult> => {
    const res = await http.post("/auth/login", { correo, password });

    // ── Flujo MFA: el servidor pide verificación de OTP ──────────────────────
    if (res.data.requiresMfa) {
      return { requiresMfa: true, challengeId: res.data.challengeId as string };
    }

    // ── Flujo directo: guardar tokens y actualizar contexto ──────────────────
    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);

    return { requiresMfa: false };
  };

  /** Completa la sesión después de pasar el challenge MFA */
  const completeMfaLogin = (data: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await http.post("/auth/logout");
    } catch {
      // Si el servidor falla, limpiamos igual en cliente
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, setUser, login, logout, completeMfaLogin }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}