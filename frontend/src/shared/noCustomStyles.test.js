import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const SRC = join(process.cwd(), "src");
// Единственное место для собственных стилей — src/app/styles (подключается в main.jsx).
const STYLES_DIR = ["app", "styles"].join(sep) + sep;

const files = walk(SRC).filter(
  (f) => !f.endsWith(".test.js") && !f.endsWith(".test.jsx"),
);

describe("только стандартный Bootstrap", () => {
  it("собственные CSS-файлы лежат только в src/app/styles", () => {
    const stray = files
      .filter((f) => /\.(css|scss|sass|less)$/.test(f))
      .filter((f) => !relative(SRC, f).startsWith(STYLES_DIR));
    expect(stray).toEqual([]);
  });
  it("стили src/app/styles подключены в main.jsx", () => {
    expect(readFileSync(join(SRC, "main.jsx"), "utf8")).toContain("@app/styles/index.css");
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
