import { describe, it, expect } from "vitest";
import {
  START_ATTRIBUTES,
  deriveStats,
  formatDamage,
  upgradeCost,
} from "./formulas.js";

describe("upgradeCost", () => {
  it("цена — квадрат нового значения", () => {
    expect(upgradeCost(3)).toBe(16);
    expect(upgradeCost(4)).toBe(25);
    expect(upgradeCost(9)).toBe(100); // повышение до 10
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
