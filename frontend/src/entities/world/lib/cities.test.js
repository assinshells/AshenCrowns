import { describe, it, expect } from "vitest";
import { CITIES, PAY_TIERS, START_CITY_KEY, citiesForLevel } from "./cities.js";
import { PAY_COEFFICIENTS, payCoefficient } from "./payCoefficients.js";

describe("коэффициенты оплаты", () => {
  it("заданы по условию", () => {
    expect(PAY_COEFFICIENTS.low).toBe(0.8);
    expect(PAY_COEFFICIENTS.average).toBe(1.0);
    expect(PAY_COEFFICIENTS.good).toBe(1.15);
    expect(PAY_COEFFICIENTS.excellent).toBe(1.3);
    expect(payCoefficient("average")).toBe(1.0);
  });
  it("есть для каждого уровня оплаты", () => {
    expect(Object.keys(PAY_COEFFICIENTS).sort()).toEqual(Object.keys(PAY_TIERS).sort());
  });
});

describe("города", () => {
  it("стартовый город — Терент, доступен с 1 уровня", () => {
    expect(START_CITY_KEY).toBe("terent");
    expect(citiesForLevel(1).map((c) => c.name)).toEqual(["Терент"]);
  });
  it("в Теренте три работы со средней оплатой и низкие цены", () => {
    const terent = CITIES.find((c) => c.key === "terent");
    expect(terent.prices).toBe("low");
    expect(terent.jobs.map((j) => [j.key, j.pay])).toEqual([
      ["gate", "average"],
      ["field", "average"],
      ["robbery", "average"],
    ]);
  });
});
