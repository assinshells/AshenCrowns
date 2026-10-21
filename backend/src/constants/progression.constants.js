/**
 * Опыт до следующего уровня: 5 · уровень².
 *   уровень 1 → 5, 2 → 20, 3 → 45, 4 → 80, 5 → 125 … 20 → 2000, 30 → 4500.
 */
export const EXPERIENCE_FACTOR = 5;
export const experienceForLevel = (level) => EXPERIENCE_FACTOR * level * level;
