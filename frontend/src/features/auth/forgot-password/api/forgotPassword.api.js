import { http } from "@shared/api/http.js";

export const forgotPasswordRequest = (dto) =>
  http.post("/api/auth/forgot-password", dto).then((r) => r.data);
