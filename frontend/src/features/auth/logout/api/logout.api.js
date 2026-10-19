import { http } from "@shared/api/http.js";

export const logoutRequest = () =>
  http.post("/api/auth/logout", {}).then((r) => r.data);
