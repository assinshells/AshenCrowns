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

  it("без статов ничего не рисует", () => {
    useSessionStore.setState({ user: { login: "Ворон" } });
    const { container } = render(<GameStats />);
    expect(container.firstChild).toBeNull();
  });
});
