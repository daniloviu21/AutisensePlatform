import axios from "axios";

// ─── Configuración base ───────────────────────────────────────────────────────

export const http = axios.create({
  // Fix #6: lee la URL de la env var de Vite, con fallback al dev local
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  withCredentials: false,
});

// ─── Callback de sincronización con AuthContext (fix #4) ──────────────────────

type UserPayload = {
  id: number;
  correo: string;
  role: string;
  clinicId: number | null;
  mustChangePassword: boolean;
};

let _onUserRefreshed: ((user: UserPayload) => void) | null = null;

/** AuthContext lo llama en el mount para recibir actualizaciones de usuario. */
export function registerUserRefreshCallback(cb: (user: UserPayload) => void) {
  _onUserRefreshed = cb;
}

// ─── Guard de redirección ─────────────────────────────────────────────────────

let isRedirectingToLogin = false;

function clearSessionAndRedirect() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  _onUserRefreshed = null;

  if (!isRedirectingToLogin) {
    isRedirectingToLogin = true;
    const isAlreadyOnLogin =
      window.location.pathname === "/" ||
      window.location.pathname === "/login";

    if (!isAlreadyOnLogin) {
      window.location.href = "/login?reason=session-expired";
      return;
    }
    window.location.reload();
  }
}

// ─── Fix #3: Cola de promesas para evitar refresh concurrente ─────────────────

let refreshPromise: Promise<string> | null = null;

async function getNewAccessToken(): Promise<string> {
  // Si ya hay un refresh en curso, espera el mismo, no lances otro
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem("refreshToken");
  if (!refresh) {
    clearSessionAndRedirect();
    throw new Error("No refreshToken");
  }

  refreshPromise = axios
    .post(`${http.defaults.baseURL}/auth/refresh`, { refreshToken: refresh })
    .then((r) => {
      localStorage.setItem("accessToken", r.data.accessToken);
      localStorage.setItem("refreshToken", r.data.refreshToken);

      if (r.data.user) {
        localStorage.setItem("user", JSON.stringify(r.data.user));
        // Sincroniza el estado React (fix #4)
        _onUserRefreshed?.(r.data.user);
      }

      return r.data.accessToken as string;
    })
    .catch((err) => {
      clearSessionAndRedirect();
      throw err;
    })
    .finally(() => {
      // Libera la cola para el siguiente ciclo
      refreshPromise = null;
    });

  return refreshPromise;
}

// ─── Interceptor de REQUEST: adjunta access token ────────────────────────────

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Interceptor de RESPONSE: renueva token en 401 ───────────────────────────

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = String(original?.url ?? "");

    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (error?.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        const newAccessToken = await getNewAccessToken();

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccessToken}`;

        return http(original);
      } catch {
        return Promise.reject(
          new Error("Tu sesión expiró. Inicia sesión nuevamente.")
        );
      }
    }

    return Promise.reject(error);
  }
);