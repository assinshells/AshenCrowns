import { describe, it, expect } from "vitest";
import { getSafeRedirect } from "./safeRedirect.js";

describe("getSafeRedirect", () => {
  it("возвращает известный защищённый маршрут", () => {
    expect(getSafeRedirect({ pathname: "/settings/security" })).toBe("/settings/security");
  });
  it("не допускает внешние и неизвестные адреса (open redirect)", () => {
    for (const p of ["//evil.com", "https://evil.com", "/unknown", "javascript:alert(1)", "/login", 5, undefined]) {
      expect(getSafeRedirect({ pathname: p })).toBe("/");
    }
    expect(getSafeRedirect(undefined)).toBe("/");
  });
});
