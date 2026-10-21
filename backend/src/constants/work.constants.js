/**
 * Работы. Награда считается ТОЛЬКО на сервере при взятии работы и фиксируется в БД;
 * зачисляется после окончания времени по кнопке «Принять оплату» (POST /api/work/claim).
 *
 *  Серебро = round( ставка часа(уровень) · часы · коэффициент длительности · модификатор кармы · множитель города )
 *
 *   ставка часа(уровень)       = 1.62 + уровень · 0.75            (1 → 2.37, 2 → 3.12, 3 → 3.87)
 *   коэффициент длительности   = 1.0 при 1 ч … 0.82 при 8 ч      (усталость; между точками — линейно)
 *   модификатор кармы          = 1.0 нейтральная, 0.9 добрая/злая
 *   множитель города           = PAY_COEFFICIENTS[уровень оплаты] (low 0.8, average 1.0, good 1.15, excellent 1.3)
 *
 *  Карма (светлая / тёмная):   ⌈часы / 2⌉                         → 1, 1, 2, 2, 3, 3, 4, 4
 *
 * Эталон — Терент (средняя оплата, множитель 1.0). Пока перемещений между городами нет,
 * все работы считаются по Терент-у (payTier = "average"). Зеркало на клиенте — frontend/.../payCoefficients.js.
 */
export const WORK_MIN_HOURS = 1;
export const WORK_MAX_HOURS = 8;
export const WORK_HOURS = Object.freeze(
  Array.from({ length: WORK_MAX_HOURS - WORK_MIN_HOURS + 1 }, (_, i) => WORK_MIN_HOURS + i),
);

/** Базовая ставка в час: BASE_HOURLY + уровень · HOURLY_PER_LEVEL. */
export const BASE_HOURLY = 1.62;
export const HOURLY_PER_LEVEL = 0.75;

/** Усталость: полная ставка за 1 час, FATIGUE_AT_MAX_HOURS за полную смену, между ними — линейно. */
export const FATIGUE_AT_MAX_HOURS = 0.82;

/** Модификатор кармы работы. Пока одинаков для всех уровней (3-й аргумент — задел под уровневую шкалу). */
export const NEUTRAL_KARMA_MODIFIER = 1.0;
export const KARMA_WORK_MODIFIER = 0.9;

/** Множители оплаты города по уровню оплаты. Ключи совпадают с PAY_TIERS на клиенте. */
export const PAY_COEFFICIENTS = Object.freeze({
  low: 0.8,
  average: 1.0,
  good: 1.15,
  excellent: 1.3,
});
export const DEFAULT_PAY_TIER = "average";

/** karma: "light" | "dark" | null (нейтральная работа — карму не меняет). */
export const WORKS = Object.freeze({
  gate: { karma: "light" },
  field: { karma: null },
  robbery: { karma: "dark" },
});

export const WORK_KINDS = Object.freeze(Object.keys(WORKS));

/** Базовая ставка серебра в час для уровня (без штрафов и бонусов). */
export const hourlyRate = (level = 1) => BASE_HOURLY + level * HOURLY_PER_LEVEL;

/** Коэффициент длительности (усталость): 1 ч → 1.0, 8 ч → 0.82. */
export const fatigueFactor = (hours) =>
  1 - ((1 - FATIGUE_AT_MAX_HOURS) * (hours - WORK_MIN_HOURS)) / (WORK_MAX_HOURS - WORK_MIN_HOURS);

/** Модификатор кармы: нейтральная работа — 1.0, добрая/злая — 0.9. */
export const karmaModifier = (kind) =>
  WORKS[kind].karma === null ? NEUTRAL_KARMA_MODIFIER : KARMA_WORK_MODIFIER;

export const workSilver = (kind, hours, level = 1, payTier = DEFAULT_PAY_TIER) =>
  Math.round(
    hourlyRate(level) *
      hours *
      fatigueFactor(hours) *
      karmaModifier(kind) *
      PAY_COEFFICIENTS[payTier],
  );

export const workKarma = (kind, hours) => {
  const type = WORKS[kind].karma;
  if (!type) return 0;
  const amount = Math.ceil(hours / 2);
  return type === "light" ? amount : -amount;
};

/** Таблица наград для клиента: по каждой работе — серебро и карма на 1…8 часов. */
export const workCatalog = (level = 1, payTier = DEFAULT_PAY_TIER) =>
  WORK_KINDS.map((kind) => ({
    key: kind,
    karma: WORKS[kind].karma,
    rewards: WORK_HOURS.map((hours) => ({
      hours,
      silver: workSilver(kind, hours, level, payTier),
      karma: Math.abs(workKarma(kind, hours)),
    })),
  }));
