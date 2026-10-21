import { http } from "@shared/api/http.js";

/** Каталог наград, активная работа, последняя завершённая и серверное время. */
export const fetchWork = () => http.get("/api/work").then((r) => r.data);

/** Взять работу: на сервере считается награда, от клиента — только вид и часы. */
export const startWork = (kind, hours) =>
  http.post("/api/work/start", { kind, hours }).then((r) => r.data);

/** Отменить идущую работу (ничего не зачисляется). */
export const cancelWork = () => http.post("/api/work/cancel", {}).then((r) => r.data);

/** «Принять оплату»: сервер зачисляет серебро и карму. Возвращает обновлённые игровые параметры. */
export const claimWork = () => http.post("/api/work/claim", {}).then((r) => r.data.stats);
