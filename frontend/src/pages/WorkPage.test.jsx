import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { fetchWork, startWork } from "@entities/work/api/work.api.js";
import { WorkPage } from "./WorkPage.jsx";

vi.mock("@entities/work/api/work.api.js", () => ({
  fetchWork: vi.fn(),
  startWork: vi.fn(),
}));

const SILVER = [2, 4, 6, 8, 10, 12, 14, 17];
const NEUTRAL = [2, 4, 7, 9, 11, 14, 16, 19];
const KARMA = [1, 1, 2, 2, 3, 3, 4, 4];
const rewards = (silver, karma) =>
  silver.map((s, i) => ({ hours: i + 1, silver: s, karma: karma ? KARMA[i] : 0 }));

const catalog = (active = null) => ({
  jobs: [
    { key: "gate", karma: "light", rewards: rewards(SILVER, true) },
    { key: "field", karma: null, rewards: rewards(NEUTRAL, false) },
    { key: "robbery", karma: "dark", rewards: rewards(SILVER, true) },
  ],
  active,
  last: null,
  serverTime: "2026-10-20T10:00:00.000Z",
});

function Progress() {
  const { state } = useLocation();
  return <div>ПРОГРЕСС {String(state?.fromWork)}</div>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/work"]}>
      <Routes>
        <Route path="/work" element={<WorkPage />} />
        <Route path="/work/progress" element={<Progress />} />
      </Routes>
    </MemoryRouter>,
  );

const card = (name) => within(screen.getByRole("region", { name }));
const value = (name, label) => card(name).getByText(label).nextSibling.textContent;
const setHours = (h) =>
  fireEvent.change(screen.getByRole("slider"), { target: { value: String(h) } });

beforeEach(() => {
  vi.mocked(fetchWork).mockReset();
  vi.mocked(startWork).mockReset();
});
afterEach(cleanup);

describe("WorkPage", () => {
  it("по умолчанию 1 час: 2 серебра, карма 1 у охраны и грабежа, у поля кармы нет", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    expect(value("Охрана ворот", "Серебро")).toBe("2");
    expect(value("Охрана ворот", "Светлая карма")).toBe("1");
    expect(value("Работа в поле", "Серебро")).toBe("2");
    expect(card("Работа в поле").queryByText(/карма/i)).toBeNull();
    expect(value("Грабёж", "Тёмная карма")).toBe("1");
    expect(card("Грабёж").queryByText("Светлая карма")).toBeNull();
  });

  it("ползунок 1–8 и описания работ", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("min")).toBe("1");
    expect(slider.getAttribute("max")).toBe("8");
    expect(card("Охрана ворот").getByText(/ворот/, { selector: "p" })).toBeTruthy();
    expect(card("Работа в поле").getByText(/крестьянам/)).toBeTruthy();
    expect(card("Грабёж").getByText(/торговцев/)).toBeTruthy();
  });

  it.each([
    [2, "4", "4", "1"],
    [3, "6", "7", "2"],
    [4, "8", "9", "2"],
    [5, "10", "11", "3"],
    [8, "17", "19", "4"],
  ])("%i ч: серебро %s (нейтральная %s), карма %s", async (hours, silver, neutral, karma) => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    setHours(hours);
    expect(value("Охрана ворот", "Серебро")).toBe(silver);
    expect(value("Охрана ворот", "Светлая карма")).toBe(karma);
    expect(value("Работа в поле", "Серебро")).toBe(neutral);
    expect(value("Грабёж", "Серебро")).toBe(silver);
    expect(value("Грабёж", "Тёмная карма")).toBe(karma);
  });

  it("«Взять работу»: запрос с видом и часами, затем переход на страницу работы", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    vi.mocked(startWork).mockResolvedValue({ active: { id: 1 } });
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    setHours(3);
    await userEvent.click(card("Грабёж").getByRole("button", { name: "Взять работу" }));

    expect(startWork).toHaveBeenCalledWith("robbery", 3);
    expect(await screen.findByText("ПРОГРЕСС true")).toBeTruthy();
  });

  it("если работа уже идёт, сразу открывается её страница", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog({ id: 5, kind: "gate", hours: 2 }));
    renderPage();
    expect(await screen.findByText("ПРОГРЕСС true")).toBeTruthy();
  });

  it("сервер ответил «уже работаете» — открывается идущая работа", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    vi.mocked(startWork).mockRejectedValue(
      Object.assign(new Error("Вы уже работаете"), { code: "ALREADY_WORKING" }),
    );
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    await userEvent.click(card("Охрана ворот").getByRole("button", { name: "Взять работу" }));
    await waitFor(() => expect(screen.getByText("ПРОГРЕСС true")).toBeTruthy());
  });

  it("другая ошибка показывается на странице", async () => {
    vi.mocked(fetchWork).mockResolvedValue(catalog());
    vi.mocked(startWork).mockRejectedValue(new Error("Сбой сервера"));
    renderPage();
    await screen.findByRole("region", { name: "Охрана ворот" });

    await userEvent.click(card("Охрана ворот").getByRole("button", { name: "Взять работу" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Сбой сервера");
  });
});
