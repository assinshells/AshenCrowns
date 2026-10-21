/**
 * Коэффициенты оплаты по уровню оплаты города (ключи совпадают с PAY_TIERS).
 * В интерфейсе не показываются. Позже будут добавлены к формуле награды за работу как бонус города
 * (см. workSilver в backend/src/constants/work.constants.js).
 */
export const PAY_COEFFICIENTS = Object.freeze({
  low: 0.8,
  average: 1.0,
  good: 1.15,
  excellent: 1.3,
});

/** Коэффициент оплаты работы в городе: payCoefficient(job.pay). */
export const payCoefficient = (tier) => PAY_COEFFICIENTS[tier];
