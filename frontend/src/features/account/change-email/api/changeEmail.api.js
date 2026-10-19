import { http } from "@shared/api/http.js";

export const requestEmailChange = (dto) =>
  http.post("/api/account/email/request", dto).then((r) => r.data);
