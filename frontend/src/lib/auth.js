import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "tnp_token";
const REFRESH_KEY = "tnp_refresh";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (t) => localStorage.setItem(REFRESH_KEY, t);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const authAxios = axios.create({ baseURL: API });

authAxios.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let isRefreshing = false;
let pending = [];

const flush = (newToken) => {
  pending.forEach(({ resolve, reject, config }) => {
    if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      resolve(authAxios(config));
    } else {
      reject(new Error("Refresh failed"));
    }
  });
  pending = [];
};

authAxios.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config || {};
    const status = err?.response?.status;

    // Don't try to refresh on the refresh endpoint itself or login
    const isAuthCall =
      original.url?.includes("/auth/refresh") || original.url?.includes("/auth/login");

    if (status === 401 && !original._retry && !isAuthCall) {
      const refresh = getRefreshToken();
      if (!refresh) {
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
          window.location.href = "/admin/login";
        }
        return Promise.reject(err);
      }

      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pending.push({ resolve, reject, config: original });
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API}/auth/refresh`, { refresh_token: refresh });
        setToken(data.access_token);
        flush(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return authAxios(original);
      } catch (refreshErr) {
        flush(null);
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
          window.location.href = "/admin/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401) {
      clearToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
