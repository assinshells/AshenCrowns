import axios from "axios";
import { getCsrfToken } from "@shared/lib/csrf.js";

/**
 * ApiError — нормализованная ошибка API.
 *  code/status — для логики интерфейса; details — список ошибок валидации;
 *  extra — публичные поля ответа (maskedEmail, retryAfterSeconds).
 */
export class ApiError extends Error {
  constructor(message, { code, status, details, extra } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code ?? "UNKNOWN_ERROR";
    this.status = status ?? 0;
    this.details = details ?? [];
    this.extra = extra ?? {};
  }
}

const toApiError = (error) => {
  const data = error.response?.data?.error;
  if (!data) {
    return new ApiError(
      error.response
        ? "Не удалось выполнить запрос"
        : "Нет связи с сервером. Проверьте подключение.",
      { status: error.response?.status ?? 0 },
    );
  }
  const { message, code, details, ...extra } = data;
  return new ApiError(message ?? "Не удалось выполнить запрос", {
    code,
    status: error.response.status,
    details,
    extra,
  });
};

// Один и тот же origin (в dev — через прокси Vite, в prod — через nginx),
// поэтому cookie сессии отправляются автоматически.
export const http = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const bare = axios.create({ baseURL: "", withCredentials: true, timeout: 15000 });

let csrfPromise = null;
const ensureCsrfToken = async () => {
  const existing = getCsrfToken();
  if (existing) return existing;
  csrfPromise ??= bare
    .get("/api/auth/csrf")
    .then(() => getCsrfToken())
    .finally(() => {
      csrfPromise = null;
    });
  return csrfPromise;
};

http.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes((config.method ?? "get").toLowerCase())) {
    const token = await ensureCsrfToken();
    if (token) config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

// 401 на защищённых запросах = серверная сессия недействительна.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Эндпоинты, где 401 — ожидаемый ответ (неверный логин / проверка сессии при старте).
const SILENT_401 = ["/api/auth/login", "/api/auth/me"];

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !SILENT_401.includes(url)) {
      onUnauthorized();
    }
    return Promise.reject(toApiError(error));
  },
);
