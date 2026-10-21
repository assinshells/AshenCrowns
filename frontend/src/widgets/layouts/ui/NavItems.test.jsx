import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavItems } from "./NavItems.jsx";

afterEach(cleanup);

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ul>
        <NavItems />
      </ul>
    </MemoryRouter>,
  );

describe("NavItems: подпункты раздела «Персонаж»", () => {
  it.each(["/", "/stats", "/karma"])("видны на %s", (path) => {
    renderAt(path);
    expect(screen.getByRole("link", { name: "Характеристики" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Силы кармы" })).toBeTruthy();
  });

  it("скрыты на других страницах", () => {
    renderAt("/work");
    expect(screen.queryByRole("link", { name: "Характеристики" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Силы кармы" })).toBeNull();
  });
});

describe("NavItems: раздел «Мир»", () => {
  it.each(["/world", "/world/missions", "/world/map"])("подпункты видны на %s", (path) => {
    renderAt(path);
    expect(screen.getByRole("link", { name: "Миссии" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Карта мира" })).toBeTruthy();
  });

  it("подпункты скрыты на других страницах", () => {
    renderAt("/work");
    expect(screen.queryByRole("link", { name: "Миссии" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Карта мира" })).toBeNull();
  });
});
