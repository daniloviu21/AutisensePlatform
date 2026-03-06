import axios from "axios";

export const http = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: false,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const url = (original?.url ?? "").toString();
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (error?.response?.status === 401 && !original?._retry) {
      const refresh = localStorage.getItem("refreshToken");
      if (!refresh) return Promise.reject(error);

      original._retry = true;

      try {
        const r = await http.post("/auth/refresh", { refreshToken: refresh });
        localStorage.setItem("accessToken", r.data.accessToken);
        localStorage.setItem("refreshToken", r.data.refreshToken);

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${r.data.accessToken}`;
        return http(original);
      } catch (e) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);