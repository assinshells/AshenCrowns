/**
 * География мира. Города, локации и события хранятся в БД (cities, locations, world_events) —
 * здесь только общие границы и вспомогательные формулы. Регионов в архитектуре нет.
 */
export const WORLD_MIN_LEVEL = 1;
export const WORLD_MAX_LEVEL = 50;

/** Стартовый город нового персонажа (cities.code; в БД помечен is_start). */
export const START_CITY_CODE = "upper_eldran";

export const RISK_MIN = 0;
export const RISK_MAX = 1;

/** Предварительная шкала риска локации (risk_coefficient не наследуется от города). */
export const RISK_BANDS = Object.freeze([
  { max: 0, key: "none" },
  { max: 0.05, key: "low" },
  { max: 0.1, key: "moderate" },
  { max: 0.2, key: "high" },
  { max: 0.3, key: "very_high" },
  { max: 0.4, key: "critical" },
]);

/** Название уровня риска по коэффициенту; выше 0.40 — тоже critical. */
export const riskBand = (risk) => {
  if (!Number.isFinite(risk) || risk < RISK_MIN || risk > RISK_MAX) {
    throw new RangeError(`risk_coefficient must be within ${RISK_MIN}..${RISK_MAX}`);
  }
  return (RISK_BANDS.find((b) => risk <= b.max) ?? RISK_BANDS.at(-1)).key;
};

/**
 * Задел под будущую систему баланса: P_effective = P_base · (1 + risk_coefficient).
 * Это индекс, а не готовая формула здоровья или урона.
 */
export const effectiveIndex = (pBase, risk) => {
  riskBand(risk);
  return pBase * (1 + risk);
};
