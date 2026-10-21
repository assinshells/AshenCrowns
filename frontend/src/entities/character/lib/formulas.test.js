import { describe, it, expect } from "vitest";
import {
  START_ATTRIBUTES,
  experienceForLevel,
  experienceLeft,
  healthRegenPerHour,
  deriveStats,
  formatDamage,
  upgradeCost,
} from "./formulas.js";

describe("upgradeCost", () => {
  it("цена — квадрат текущего значения", () => {
    expect(upgradeCost(3)).toBe(9);
    expect(upgradeCost(4)).toBe(16);
    expect(upgradeCost(10)).toBe(100); // повышение с 10 на 11
  });
});

describe("deriveStats", () => {
  it("стартовые значения", () => {
    const d = deriveStats(START_ATTRIBUTES);
    expect(formatDamage(d.damage)).toBe("1 - 1");
    expect(d.armor).toBe(1);
    expect(d.maxHealth).toBe(75);
    expect(d.hitChance).toBe(3);
    expect(d.blockChance).toBe(3);
  });

  it("примеры из задания: характеристика 10", () => {
    const base = START_ATTRIBUTES;
    expect(formatDamage(deriveStats({ ...base, strength: 10 }).damage)).toBe("3 - 3");
    expect(deriveStats({ ...base, giftedness: 10 }).armor).toBe(3);
    expect(deriveStats({ ...base, constitution: 10 }).maxHealth).toBe(250);
    expect(deriveStats({ ...base, attack: 10 }).hitChance).toBe(10);
    expect(deriveStats({ ...base, defense: 10 }).blockChance).toBe(10);
  });

  it("удача на производные не влияет", () => {
    expect(deriveStats({ ...START_ATTRIBUTES, luck: 50 })).toEqual(deriveStats(START_ATTRIBUTES));
  });
});

describe("experienceForLevel", () => {
  it("5 · уровень²: значения из задания", () => {
    expect([1, 2, 3, 4, 5].map(experienceForLevel)).toEqual([5, 20, 45, 80, 125]);
    expect(experienceForLevel(20)).toBe(2000);
    expect(experienceForLevel(30)).toBe(4500);
  });
});

describe("experienceLeft", () => {
  it("разница между нужным и полученным", () => {
    expect(experienceLeft(0, 5)).toBe(5);
    expect(experienceLeft(4, 5)).toBe(1);
    expect(experienceLeft(7, 5)).toBe(0);
  });
});

describe("healthRegenPerHour", () => {
  it("по умолчанию 11 в час", () => {
    expect(healthRegenPerHour(75)).toBe(11);
    expect(healthRegenPerHour(250)).toBe(37);
  });
});
