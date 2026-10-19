import { http } from "@shared/api/http.js";

export const resetPasswordRequest = (dto) =>
  http.post("/api/auth/reset-password", dto).then((r) => r.data);
