import { http } from "@shared/api/http.js";

/** Сервер выставляет httpOnly-cookie сессии; в теле — только публичный профиль. */
export const loginRequest = (dto) =>
  http.post("/api/auth/login", dto).then((r) => r.data.user);
