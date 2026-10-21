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

/** Стартовая карма. Светлая и тёмная не бывают одновременно: на сервере хранится одно число. */
export const START_KARMA = Object.freeze({ dark: 0, light: 0 });

export const HEALTH_PER_CONSTITUTION = 25;
export const STRENGTH_PER_DAMAGE = 3;
export const GIFTEDNESS_PER_ARMOR = 3;

/** Цена повышения с текущего значения — его квадрат (с 3 стоит 9; с 10 на 11 — 100). */
export const upgradeCost = (current) => current ** 2;

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

/** Опыт до следующего уровня: 5 · уровень² (1 → 5, 2 → 20, 3 → 45 … 20 → 2000, 30 → 4500). */
export const EXPERIENCE_FACTOR = 5;
export const experienceForLevel = (level) => EXPERIENCE_FACTOR * level ** 2;

/** Сколько очков опыта осталось до следующего уровня (получено 4 из 5 → 1). */
export const experienceLeft = (experience, experienceToNext) =>
  Math.max(0, experienceToNext - experience);

/**
 * Генерация здоровья в час: ⌊10 + телосложение · 0.6⌋ (3 → 11, 10 → 16). Только отображение.
 * Дробная часть считается целыми числами (телосложение · 6 / 10), чтобы не зависеть от погрешности float.
 */
export const HEALTH_REGEN_BASE = 10;
export const healthRegenPerHour = (constitution) =>
  HEALTH_REGEN_BASE + Math.floor((constitution * 6) / 10);

/** Подсказки под характеристиками. */
export const ATTRIBUTE_HINTS = Object.freeze({
  strength: "Чем вы сильнее, тем больше повреждений вы нанесёте противнику.",
  giftedness: "Чем больше одаренность, тем меньше урона вам нанесут.",
  constitution:
    "Чем выше ваше телосложение, тем больше у вас пунктов жизни и быстрее идёт восстановление здоровья.",
  luck: "Удача влияет на ваш шанс нанести критический удар, а также на количество ограбленного серебра.",
  attack: "Чем выше ваш навык оружия, тем больше шанс ударить противника.",
  defense: "Чем лучше вы управляетесь со своим щитом, тем меньше урона вы получите.",
});

export const formatDamage = ({ min, max }) => `${min} - ${max}`;
