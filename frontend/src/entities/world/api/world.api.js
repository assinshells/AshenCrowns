import { http } from "@shared/api/http.js";

/** Карта мира: все города с доступностью для уровня игрока, текущий город, серверное время. */
export const fetchWorld = () => http.get("/api/world").then((r) => r.data);

/** Город с локациями. Закрытый город отвечает 403 CITY_LOCKED (локации не раскрываются). */
export const fetchCity = (id) => http.get(`/api/world/cities/${id}`).then((r) => r.data);
