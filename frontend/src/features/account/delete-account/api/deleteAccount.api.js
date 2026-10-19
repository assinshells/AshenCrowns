import { http } from "@shared/api/http.js";

export const deleteAccountRequest = (dto) =>
  http.post("/api/account/delete", dto).then((r) => r.data);
