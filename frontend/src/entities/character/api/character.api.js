import { http } from "@shared/api/http.js";

/** Повышает характеристику на 1 за серебро. Возвращает обновлённые игровые параметры (stats). */
export const upgradeAttribute = (attribute) =>
  http.post("/api/character/attributes/upgrade", { attribute }).then((r) => r.data.stats);
