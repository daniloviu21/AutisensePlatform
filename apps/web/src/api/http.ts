import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const http = axios.create({
  baseURL: API_URL,
});

function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pending: Array<(t: string) => void> = [];

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) throw error;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pending.push((newToken) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(http(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const r = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem("accessToken", r.data.accessToken);
        localStorage.setItem("refreshToken", r.data.refreshToken);

        pending.forEach((cb) => cb(r.data.accessToken));
        pending = [];

        original.headers.Authorization = `Bearer ${r.data.accessToken}`;
        return http(original);
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);