import { describe, it, expect } from "vitest";
import { formatDuration, rewardFor } from "./jobs.js";

describe("formatDuration", () => {
  it("форматирует ЧЧ:ММ:СС", () => {
    expect(formatDuration(3725000)).toBe("01:02:05");
    expect(formatDuration(8 * 3600 * 1000)).toBe("08:00:00");
    expect(formatDuration(1)).toBe("00:00:01");
  });
  it("не уходит в минус", () => {
    expect(formatDuration(-5000)).toBe("00:00:00");
  });
});

describe("rewardFor", () => {
  it("находит награду по часам", () => {
    const job = { rewards: [{ hours: 1, silver: 2, karma: 1 }, { hours: 2, silver: 4, karma: 1 }] };
    expect(rewardFor(job, 2).silver).toBe(4);
    expect(rewardFor(job, 5)).toBeUndefined();
  });
});
