import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fetchCity, fetchWorld } from "@entities/world/api/world.api.js";
import { WorldMapPage } from "./WorldMapPage.jsx";

vi.mock("@entities/world/api/world.api.js", () => ({
  fetchWorld: vi.fn(),
  fetchCity: vi.fn(),
}));

const city = (over) => ({
  id: 1,
  code: "upper_eldran",
  name: "Верхний Эльдран",
  kind: "permanent",
  requiredLevel: 1,
  accessible: true,
  isCurrent: false,
  event: null,
  ...over,
});

const world = (cities, currentCityId = 1) => ({ serverTime: "2026-10-22T10:00:00.000Z", currentCityId, cities });

const ELDRAN_LOCATIONS = [
  { id: 1, code: "a", name: "Рыночная площадь", requiredLevel: 1, requiresQuest: false, accessible: true, risk: "none" },
  { id: 2, code: "b", name: "Старая стена", requiredLevel: 1, requiresQuest: false, accessible: true, risk: "low" },
  { id: 4, code: "d", name: "Подвалы под площадью", requiredLevel: 3, requiresQuest: false, accessible: false, risk: "critical" },
];

beforeEach(() => {
  vi.mocked(fetchWorld).mockReset();
  vi.mocked(fetchCity).mockReset();
  vi.mocked(fetchCity).mockResolvedValue({ locations: ELDRAN_LOCATIONS });
});
afterEach(cleanup);

describe("WorldMapPage", () => {
  it("текущий город раскрыт и отмечен, локации с уровнем риска без коэффициентов", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(world([city({ isCurrent: true })]));
    render(<WorldMapPage />);
    expect(await screen.findByText("Вы находитесь здесь")).toBeTruthy();
    expect(await screen.findByText("Рыночная площадь")).toBeTruthy();
    expect(fetchCity).toHaveBeenCalledWith(1);
    expect(screen.getByText("Риск: Без риска")).toBeTruthy();
    expect(screen.getByText("Риск: Низкий")).toBeTruthy();
    expect(screen.getByText("Риск: Критический")).toBeTruthy();
    // закрытая локация показывает нужный уровень
    expect(screen.getByText("С 3 уровня")).toBeTruthy();
    expect(screen.queryByText(/0\.\d\d/)).toBeNull();
  });

  it("закрытый по уровню город неактивен и не запрашивает локации", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(
      world([city({ isCurrent: true }), city({ id: 2, code: "lower_eldran", name: "Нижний Эльдран", requiredLevel: 3, accessible: false })]),
    );
    render(<WorldMapPage />);
    const locked = await screen.findByRole("button", { name: /Нижний Эльдран/ });
    expect(locked.disabled).toBe(true);
    expect(within(locked).getByText("С 3 уровня")).toBeTruthy();
    await userEvent.click(locked);
    expect(fetchCity).not.toHaveBeenCalledWith(2);
  });

  it("список сворачивается и разворачивается", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(world([city({ isCurrent: true })]));
    render(<WorldMapPage />);
    const toggle = await screen.findByRole("button", { name: /Верхний Эльдран/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("города событий — отдельным блоком, с состоянием события", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(
      world([
        city({ isCurrent: true }),
        city({
          id: 21, code: "verbny_grad", name: "Вербный Град", kind: "event", requiredLevel: 5, accessible: false,
          event: { state: "upcoming", startsAt: "2027-04-24T10:00:00.000Z", endsAt: "2027-05-01T10:00:00.000Z", timezone: "UTC" },
        }),
        city({
          id: 22, code: "twelve_lights", name: "Город Двенадцати Огней", kind: "event", requiredLevel: 5, accessible: false,
          event: { state: "unscheduled", startsAt: null, endsAt: null, timezone: "UTC" },
        }),
        city({
          id: 23, code: "first_crown", name: "Город Первой Короны", kind: "event", requiredLevel: 5, accessible: false,
          event: { state: "closed", startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-01-08T00:00:00.000Z", timezone: "UTC" },
        }),
      ]),
    );
    render(<WorldMapPage />);
    const block = within(await screen.findByRole("region", { name: "Города событий" }));
    expect(block.getByText("Вербный Град")).toBeTruthy();
    expect(block.getAllByText("Событие")).toHaveLength(3);
    expect(block.getByText(/Событие начнётся 24 апреля 2027/)).toBeTruthy();
    expect(block.getByText("Даты события пока не объявлены")).toBeTruthy();
    expect(block.getByText(/Событие завершено/)).toBeTruthy();
    // постоянные города не попадают в блок событий
    expect(block.queryByText("Верхний Эльдран")).toBeNull();
  });

  it("открытое событие: город доступен и грузит локации", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(
      world([
        city({ isCurrent: true }),
        city({
          id: 21, code: "verbny_grad", name: "Вербный Град", kind: "event", requiredLevel: 5, accessible: true,
          event: { state: "open", startsAt: "2026-10-22T00:00:00.000Z", endsAt: "2026-10-29T00:00:00.000Z", timezone: "UTC" },
        }),
      ]),
    );
    vi.mocked(fetchCity).mockImplementation(async (id) =>
      id === 21
        ? { locations: [{ id: 81, code: "w", name: "Площадь вербных веток", requiredLevel: 5, requiresQuest: false, accessible: true, risk: "none" }] }
        : { locations: ELDRAN_LOCATIONS },
    );
    render(<WorldMapPage />);
    expect(await screen.findByText(/Событие идёт до 29 октября 2026/)).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: /Вербный Град/ }));
    expect(await screen.findByText("Площадь вербных веток")).toBeTruthy();
  });

  it("ошибка загрузки карты показывается пользователю", async () => {
    vi.mocked(fetchWorld).mockRejectedValue(Object.assign(new Error("Нет связи с сервером"), { details: [] }));
    render(<WorldMapPage />);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Нет связи с сервером"));
  });

  it("ошибка загрузки локаций не ломает карту", async () => {
    vi.mocked(fetchWorld).mockResolvedValue(world([city({ isCurrent: true })]));
    vi.mocked(fetchCity).mockRejectedValue(Object.assign(new Error("Город пока недоступен"), { details: [] }));
    render(<WorldMapPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Город пока недоступен");
    expect(screen.getByRole("button", { name: /Верхний Эльдран/ })).toBeTruthy();
  });
});
