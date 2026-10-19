import { http } from "@shared/api/http.js";

export const requestPasswordChange = (dto) =>
  http.post("/api/account/password/request", dto).then((r) => r.data);
