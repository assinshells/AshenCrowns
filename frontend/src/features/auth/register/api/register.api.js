import { http } from "@shared/api/http.js";

/** @returns {Promise<{ requiresEmailVerification: boolean, maskedEmail: string, resendAfterSeconds: number }>} */
export const registerRequest = (dto) =>
  http.post("/api/auth/register", dto).then((r) => r.data);
