import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { upgradeAttribute } from "@entities/character/api/character.api.js";
import { StatsPage } from "./StatsPage.jsx";

vi.mock("@entities/character/api/character.api.js", () => ({
  upgradeAttribute: vi.fn(),
}));

const stats = (over = {}, attrs = {}) => ({
  level: 1,
  health: 75,
  maxHealth: 75,
  experience: 0,
  experienceToNext: 5,
  silver: 200,
  rubies: 0,
  karma: { light: 0, dark: 0 },
  attributes: { strength: 3, giftedness: 3, constitution: 3, luck: 3, attack: 3, defense: 3, ...attrs },
  ...over,
});

const setStats = (s, load = vi.fn()) =>
  useSessionStore.setState({ status: "authenticated", user: { id: 1, login: "hero", stats: s }, load });

const upgradeButton = (label) =>
  screen.getByRole("button", { name: new RegExp(`Повысить характеристику «${label}»`) });

beforeEach(() => {
  // Без возврата значения: возвращённая из beforeEach функция считалась бы хуком очистки.
  vi.mocked(upgradeAttribute).mockReset();
});
afterEach(cleanup);

describe("StatsPage", () => {
  it("показывает стартовые значения, цену и производные", () => {
    setStats(stats());
    render(<StatsPage />);

    expect(screen.getAllByText("Базовое значение: 3 · Цена: 9")).toHaveLength(6);
    const derived = screen.getByText("Пункты жизни").closest("dl");
    expect(within(derived).getByText("75 / 75")).toBeTruthy();
    expect(within(derived).getByText("Карма").nextSibling.textContent).toBe("0");
    expect(within(derived).getByText("Урон").nextSibling.textContent).toBe("1 - 1");
    expect(within(derived).getByText("Броня").nextSibling.textContent).toBe("1");
    expect(within(derived).getByText("Шанс на удар").nextSibling.textContent).toBe("3");
    expect(within(derived).getByText("Шанс на защиту").nextSibling.textContent).toBe("3");
  });

  it("под каждой характеристикой — инфотекст", () => {
    setStats(stats());
    render(<StatsPage />);
    expect(screen.getByText(/Чем вы сильнее, тем больше повреждений/)).toBeTruthy();
    expect(screen.getByText(/Чем больше одаренность, тем меньше урона/)).toBeTruthy();
    expect(screen.getByText(/телосложение, тем больше у вас пунктов жизни и быстрее идёт восстановление/)).toBeTruthy();
    expect(screen.getByText(/Удача влияет на ваш шанс нанести критический удар/)).toBeTruthy();
    expect(screen.getByText(/Чем выше ваш навык оружия/)).toBeTruthy();
    expect(screen.getByText(/Чем лучше вы управляетесь со своим щитом/)).toBeTruthy();
  });

  it("карма: показывается та, что есть (светлая или тёмная)", () => {
    setStats(stats({ karma: { light: 2, dark: 0 } }));
    render(<StatsPage />);
    expect(screen.getByText("Карма").nextSibling.textContent).toBe("2 (светлая)");

    cleanup();
    setStats(stats({ karma: { light: 0, dark: 7 } }));
    render(<StatsPage />);
    expect(screen.getByText("Карма").nextSibling.textContent).toBe("7 (тёмная)");
  });

  it("кнопка неактивна, пока серебра меньше цены", () => {
    setStats(stats({ silver: 8 }));
    render(<StatsPage />);
    expect(upgradeButton("Сила").disabled).toBe(true);

    cleanup();
    setStats(stats({ silver: 9 }));
    render(<StatsPage />);
    expect(upgradeButton("Сила").disabled).toBe(false);
  });

  it("повышение: запрос с ключом, новые значения и цена применяются на странице", async () => {
    setStats(stats());
    vi.mocked(upgradeAttribute).mockResolvedValue(
      stats({ silver: 191, maxHealth: 100, health: 100 }, { constitution: 4 }),
    );
    render(<StatsPage />);

    await userEvent.click(upgradeButton("Телосложение"));

    expect(upgradeAttribute).toHaveBeenCalledWith("constitution");
    await waitFor(() => expect(screen.getByText("100 / 100")).toBeTruthy());
    expect(screen.getByText("Базовое значение: 4 · Цена: 16")).toBeTruthy();
    expect(useSessionStore.getState().user.stats.silver).toBe(191);
  });

  it("после повышения до порога серебра кнопки блокируются", async () => {
    setStats(stats({ silver: 20 }));
    vi.mocked(upgradeAttribute).mockResolvedValue(stats({ silver: 4 }, { strength: 4 }));
    render(<StatsPage />);

    await userEvent.click(upgradeButton("Сила"));
    await waitFor(() => expect(upgradeButton("Искусство атаки").disabled).toBe(true));
  });

  it("ответ сервера «не хватает серебра»: ошибка и перезагрузка профиля", async () => {
    const load = vi.fn();
    setStats(stats(), load);
    const err = Object.assign(new Error("Недостаточно серебра"), { code: "INSUFFICIENT_SILVER" });
    vi.mocked(upgradeAttribute).mockRejectedValue(err);
    render(<StatsPage />);

    await userEvent.click(upgradeButton("Сила"));

    expect((await screen.findByRole("alert")).textContent).toContain("Недостаточно серебра");
    expect(load).toHaveBeenCalledTimes(1);
  });
});
