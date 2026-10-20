/**
 * Характеристики персонажа. Ключ — имя в API, column — колонка в таблице users
 * (значения колонок подставляются в SQL только из этого белого списка).
 */
export const ATTRIBUTES = Object.freeze({
  strength: "strength",
  giftedness: "giftedness",
  constitution: "constitution",
  luck: "luck",
  attack: "attack_skill",
  defense: "defense_skill",
});

export const ATTRIBUTE_KEYS = Object.freeze(Object.keys(ATTRIBUTES));

/** Здоровье за единицу телосложения: 3 → 75, 10 → 250. */
export const HEALTH_PER_CONSTITUTION = 25;

/** Цена повышения до значения `next` — его квадрат (3 → 4 стоит 16, до 10 — 100). */
export const upgradeCost = (next) => next * next;
