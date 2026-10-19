import { http } from "@shared/api/http.js";

/** Профиль всегда загружается с сервера — клиентскому хранилищу не доверяем. */
export const fetchMe = () =>
  http.get("/api/auth/me").then((r) => r.data.user);
