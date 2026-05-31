import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const cleanUrl = configuredUrl.replace(/\/+$/, "");
const apiBaseURL = cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;

export const http = axios.create({
  baseURL: apiBaseURL,
  withCredentials: false,
});


type UserPayload = {
  id: number;
  correo: string;
  role: string;
  clinicId: number | null;
  mustChangePassword: boolean;
};

let _onUserRefreshed: ((user: UserPayload) => void) | null = null;

export function registerUserRefreshCallback(cb: (user: UserPayload) => void) {
  _onUserRefreshed = cb;
}


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


let refreshPromise: Promise<string> | null = null;

async function getNewAccessToken(): Promise<string> {
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
        _onUserRefreshed?.(r.data.user);
      }

      return r.data.accessToken as string;
    })
    .catch((err) => {
      clearSessionAndRedirect();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = String(original?.url ?? "");

    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/mfa/verify") ||
      url.includes("/auth/mfa/resend");

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