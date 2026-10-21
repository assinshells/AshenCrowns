/**
 * Города мира и оплата работ в них.
 * Оплата задаётся уровнем (tier). Числовые коэффициенты — в payCoefficients.js и в интерфейсе не показываются.
 * Города открываются с ростом уровня персонажа (minLevel). Новый город — новая запись в CITIES.
 */
export const PAY_TIERS = Object.freeze({
  low: { label: "Низкая оплата" },
  average: { label: "Средняя оплата" },
  good: { label: "Хорошая оплата" },
  excellent: { label: "Превосходная оплата" },
});

/** Уровень цен на вещи в городе. */
export const PRICE_LABEL = "Цены на вещи";
export const PRICE_LEVELS = Object.freeze({
  low: "Низкие",
  average: "Средние",
  high: "Высокие",
});

/** Работы совпадают с ключами из entities/work/lib/jobs.js (gate, field, robbery). */
export const CITIES = Object.freeze([
  {
    key: "terent",
    name: "Терент",
    minLevel: 1,
    prices: "low",
    jobs: [
      { key: "gate", title: "Охрана ворот", pay: "average" },
      { key: "field", title: "Работа в поле", pay: "average" },
      { key: "robbery", title: "Грабёж", pay: "average" },
    ],
  },
]);

/** Стартовый город нового персонажа. */
export const START_CITY_KEY = "terent";

/** Город, где сейчас находится игрок. Пока перемещений нет — всегда стартовый. */
export const currentCityKey = () => START_CITY_KEY;

/** Города, доступные на данном уровне. */
export const citiesForLevel = (level) => CITIES.filter((c) => c.minLevel <= level);

export const payTier = (key) => PAY_TIERS[key];

