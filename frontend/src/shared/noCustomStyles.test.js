import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(join(process.cwd(), "src")).filter(
  (f) => !f.endsWith(".test.js") && !f.endsWith(".test.jsx"),
);

describe("только стандартный Bootstrap", () => {
  it("в src нет собственных CSS-файлов", () => {
    expect(files.filter((f) => /\.(css|scss|sass|less)$/.test(f))).toEqual([]);
  });
  it("нет inline-стилей style={{...}} / style=", () => {
    const offenders = files.filter(
      (f) => /\.jsx?$/.test(f) && /\bstyle\s*=/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
  it("нет localStorage/sessionStorage", () => {
    const offenders = files.filter(
      (f) => /\.jsx?$/.test(f) && /(localStorage|sessionStorage)/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
