import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { GameStats } from "./GameStats.jsx";

afterEach(() => {
  cleanup();
  useSessionStore.setState({ user: null });
});

describe("GameStats", () => {
  it("показывает стартовые параметры игрока", () => {
    useSessionStore.setState({
      user: {
        login: "Ворон",
        stats: { level: 1, health: 75, maxHealth: 75, experience: 0, experienceToNext: 5, silver: 200, rubies: 0 },
      },
    });
    render(<GameStats />);
    expect(screen.getByLabelText("Жизни: 75 из 75")).toBeTruthy();
    expect(screen.getByLabelText("Уровень 1, опыт: 0 из 5")).toBeTruthy();
    expect(screen.getByLabelText("Серебро: 200")).toBeTruthy();
    expect(screen.getByLabelText("Рубины: 0")).toBeTruthy();
    expect(screen.getByText("0/5")).toBeTruthy();
  });

  it("инфотекст: генерация жизней в час и очки опыта до следующего уровня", () => {
    useSessionStore.setState({
      user: {
        login: "Ворон",
        stats: { level: 2, health: 75, maxHealth: 75, experience: 4, experienceToNext: 5, silver: 0, rubies: 0 },
      },
    });
    render(<GameStats />);
    expect(screen.getByText("Генерация пунктов жизни в час: 11")).toBeTruthy();
    expect(screen.getByText("До следующего уровня очков опыта: 1")).toBeTruthy();
  });

  it("генерация жизней растёт с телосложением: 3 → 11, 10 → 16", () => {
    const withConstitution = (constitution) =>
      useSessionStore.setState({
        user: {
          login: "Ворон",
          stats: {
            level: 1, health: 75, maxHealth: 75, experience: 0, experienceToNext: 5, silver: 0, rubies: 0,
            attributes: { constitution },
          },
        },
      });

    withConstitution(3);
    render(<GameStats />);
    expect(screen.getByText("Генерация пунктов жизни в час: 11")).toBeTruthy();

    cleanup();
    withConstitution(10);
    render(<GameStats />);
    expect(screen.getByText("Генерация пунктов жизни в час: 16")).toBeTruthy();
  });

  it("без статов ничего не рисует", () => {
    useSessionStore.setState({ user: { login: "Ворон" } });
    const { container } = render(<GameStats />);
    expect(container.firstChild).toBeNull();
  });
});
