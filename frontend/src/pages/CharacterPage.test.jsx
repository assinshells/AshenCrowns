import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { CharacterPage } from "./CharacterPage.jsx";

afterEach(cleanup);

const valueOf = (root, label) => within(root).getByText(label).nextSibling.textContent;

describe("CharacterPage", () => {
  it("стартовые значения подробной информации и характеристик", () => {
    useSessionStore.setState({ status: "authenticated", user: { id: 1, login: "hero", stats: undefined } });
    render(<CharacterPage />);

    const info = screen.getByRole("region", { name: "Подробная информация" });
    expect(valueOf(info, "Уровень")).toBe("1");
    expect(valueOf(info, "Орден")).toBe("---");
    expect(valueOf(info, "Ранг ордена")).toBe("---");
    for (const label of [
      "Добыча (получено)",
      "Добыча (потеряно)",
      "Выигранные турниры",
      "Победы",
      "Ничьи",
      "Поражения",
    ]) {
      expect(valueOf(info, label)).toBe("0");
    }

    const stats = screen.getByRole("region", { name: "Характеристики" });
    for (const label of ["Сила", "Одаренность", "Телосложение", "Удача", "Искусство атаки", "Искусство защиты"]) {
      expect(valueOf(stats, label)).toBe("3");
    }
    expect(valueOf(stats, "Урон")).toBe("1 - 1");
    expect(valueOf(stats, "Броня")).toBe("1");
  });

  it("повышенные характеристики и производные берутся из профиля", () => {
    useSessionStore.setState({
      status: "authenticated",
      user: {
        id: 1,
        login: "hero",
        stats: {
          level: 2,
          health: 250,
          maxHealth: 250,
          silver: 0,
          attributes: { strength: 10, giftedness: 10, constitution: 10, luck: 3, attack: 10, defense: 10 },
        },
      },
    });
    render(<CharacterPage />);

    const stats = screen.getByRole("region", { name: "Характеристики" });
    expect(valueOf(stats, "Сила")).toBe("10");
    expect(valueOf(stats, "Урон")).toBe("3 - 3");
    expect(valueOf(stats, "Броня")).toBe("3");
    expect(valueOf(screen.getByRole("region", { name: "Подробная информация" }), "Уровень")).toBe("2");
  });
});
