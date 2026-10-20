/**
 * Работы. Награда считается ТОЛЬКО на сервере при взятии работы и фиксируется в БД.
 *
 *  Серебро (обычные работы):   2 за час, +1 за полную смену в 8 часов  → 2, 4, 6, 8, 10, 12, 14, 17
 *  Серебро (нейтральная):      то же + ⌊часы / 3⌋                      → 2, 4, 7, 9, 11, 14, 16, 19
 *  Карма (светлая / тёмная):   ⌈часы / 2⌉                              → 1, 1, 2, 2, 3, 3, 4, 4
 *
 * Значения для 6 и 7 часов выведены из заданных точек (1–5 и 8 часов) и легко меняются здесь.
 * Базовая ставка — для 1-го уровня; уровень игрока пока на награду не влияет.
 */
export const WORK_MIN_HOURS = 1;
export const WORK_MAX_HOURS = 8;
export const WORK_HOURS = Object.freeze(
  Array.from({ length: WORK_MAX_HOURS - WORK_MIN_HOURS + 1 }, (_, i) => WORK_MIN_HOURS + i),
);

export const SILVER_PER_HOUR = 2;
export const FULL_SHIFT_BONUS = 1;

/** karma: "light" | "dark" | null (нейтральная работа — карму не меняет). */
export const WORKS = Object.freeze({
  gate: { karma: "light" },
  field: { karma: null },
  robbery: { karma: "dark" },
});

export const WORK_KINDS = Object.freeze(Object.keys(WORKS));

// eslint-disable-next-line no-unused-vars -- level зарезервирован под масштабирование ставки
export const workSilver = (kind, hours, level = 1) => {
  const base =
    hours * SILVER_PER_HOUR + (hours === WORK_MAX_HOURS ? FULL_SHIFT_BONUS : 0);
  return WORKS[kind].karma === null ? base + Math.floor(hours / 3) : base;
};

export const workKarma = (kind, hours) => {
  const type = WORKS[kind].karma;
  if (!type) return 0;
  const amount = Math.ceil(hours / 2);
  return type === "light" ? amount : -amount;
};

/** Таблица наград для клиента: по каждой работе — серебро и карма на 1…8 часов. */
export const workCatalog = (level = 1) =>
  WORK_KINDS.map((kind) => ({
    key: kind,
    karma: WORKS[kind].karma,
    rewards: WORK_HOURS.map((hours) => ({
      hours,
      silver: workSilver(kind, hours, level),
      karma: Math.abs(workKarma(kind, hours)),
    })),
  }));
