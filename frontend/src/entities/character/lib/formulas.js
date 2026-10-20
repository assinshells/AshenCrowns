/**
 * Характеристики персонажа и формулы производных значений.
 * Серверная сторона (backend/src/constants/character.constants.js) независимо
 * проверяет цену и пересчитывает здоровье — клиент только отображает.
 */

export const ATTRIBUTES = Object.freeze([
  { key: "strength", label: "Сила" },
  { key: "giftedness", label: "Одаренность" },
  { key: "constitution", label: "Телосложение" },
  { key: "luck", label: "Удача" },
  { key: "attack", label: "Искусство атаки" },
  { key: "defense", label: "Искусство защиты" },
]);

/** Стартовые значения нового персонажа (совпадают с DEFAULT колонок в БД). */
export const START_ATTRIBUTES = Object.freeze({
  strength: 3,
  giftedness: 3,
  constitution: 3,
  luck: 3,
  attack: 3,
  defense: 3,
});

/** Карма: пока не хранится на сервере, у всех 0. */
export const START_KARMA = Object.freeze({ dark: 0, light: 0 });

export const HEALTH_PER_CONSTITUTION = 25;
export const STRENGTH_PER_DAMAGE = 3;
export const GIFTEDNESS_PER_ARMOR = 3;

/** Цена повышения с текущего значения: квадрат НОВОГО значения (3 → 4 стоит 16; до 10 — 100). */
export const upgradeCost = (current) => (current + 1) ** 2;

/**
 * Производные значения из характеристик.
 *  Сила → урон: ⌊сила / 3⌋ (3 → 1, 10 → 3)
 *  Одаренность → броня: ⌊одаренность / 3⌋ (3 → 1, 10 → 3)
 *  Телосложение → максимум здоровья: 25 за единицу (3 → 75, 10 → 250)
 *  Искусство атаки → шанс на удар, искусство защиты → шанс на защиту: равны значению
 */
export function deriveStats(attributes) {
  const damage = Math.floor(attributes.strength / STRENGTH_PER_DAMAGE);
  return {
    damage: { min: damage, max: damage },
    armor: Math.floor(attributes.giftedness / GIFTEDNESS_PER_ARMOR),
    maxHealth: attributes.constitution * HEALTH_PER_CONSTITUTION,
    hitChance: attributes.attack,
    blockChance: attributes.defense,
  };
}

export const formatDamage = ({ min, max }) => `${min} - ${max}`;
