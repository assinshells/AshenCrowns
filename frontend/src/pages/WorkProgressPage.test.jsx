import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { cancelWork, claimWork, fetchWork } from "@entities/work/api/work.api.js";
import { WorkProgressPage } from "./WorkProgressPage.jsx";

vi.mock("@entities/work/api/work.api.js", () => ({
  fetchWork: vi.fn(),
  cancelWork: vi.fn(),
  claimWork: vi.fn(),
}));

const T0 = Date.parse("2026-10-20T10:00:00.000Z");
const HOUR = 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString();

const job = (over = {}) => ({
  id: 7,
  kind: "gate",
  hours: 8,
  silver: 17,
  karma: 4,
  status: "active",
  finished: false,
  startedAt: iso(T0),
  endsAt: iso(T0 + HOUR),
  ...over,
});
const state = (active, serverTime = iso(T0)) => ({ jobs: [], active, serverTime });
const finishedState = (over = {}) => state(job({ finished: true, ...over }), iso(T0 + HOUR + 1000));

const renderAt = (entry) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/work" element={<div>СПИСОК РАБОТ</div>} />
        <Route path="/work/progress" element={<WorkProgressPage />} />
      </Routes>
    </MemoryRouter>,
  );
const FROM_WORK = { pathname: "/work/progress", state: { fromWork: true } };

const claimButton = () => screen.getByRole("button", { name: "Принять оплату" });

let load;
beforeEach(() => {
  vi.mocked(fetchWork).mockReset();
  vi.mocked(cancelWork).mockReset();
  vi.mocked(claimWork).mockReset();
  load = vi.fn().mockResolvedValue(undefined);
  useSessionStore.setState({ status: "authenticated", user: { id: 1, login: "hero" }, load });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("WorkProgressPage: доступ", () => {
  it("по прямой ссылке не доступна: редирект на «Работа»", async () => {
    renderAt("/work/progress");
    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
    expect(fetchWork).not.toHaveBeenCalled();
  });

  it("если активной работы нет — возврат на «Работа»", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(null));
    renderAt(FROM_WORK);
    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
  });
});

describe("WorkProgressPage: работа идёт", () => {
  it("время, полоса и общая фраза; награда и оплата не показываются", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job()));
    renderAt(FROM_WORK);

    expect(await screen.findByText("01:00:00")).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Прогресс работы" });
    expect(bar.getAttribute("max")).toBe(String(HOUR));
    expect(screen.getByText("Сейчас вы отсутствуете, так как зарабатываете себе на жизнь.")).toBeTruthy();
    expect(screen.queryByText(/заработали/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Принять оплату" })).toBeNull();
    expect(screen.queryByLabelText(/Серебро/)).toBeNull();
  });

  it("отсчёт идёт по серверному времени, а не по часам браузера", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job(), iso(T0 + HOUR / 2)));
    renderAt(FROM_WORK);
    expect(await screen.findByText("00:30:00")).toBeTruthy();
  });

  it("отмена без подтверждения: сразу запрос и возврат на «Работа»", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job()));
    vi.mocked(cancelWork).mockResolvedValue({ success: true, cancelled: true });
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Отменить работу" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
    expect(cancelWork).toHaveBeenCalledTimes(1);
  });

  it("пока отмена нажата в последнюю секунду: время вышло — показывается оплата", async () => {
    vi.mocked(fetchWork)
      .mockResolvedValueOnce(state(job()))
      .mockResolvedValueOnce(finishedState());
    vi.mocked(cancelWork).mockResolvedValue({ success: true, cancelled: false });
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Отменить работу" }));
    expect(await screen.findByRole("button", { name: "Принять оплату" })).toBeTruthy();
  });
});

describe("WorkProgressPage: работа закончена", () => {
  it("вместо прогресса: «Во время работы вы заработали» с серебром и светлой кармой", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState());
    renderAt(FROM_WORK);

    expect(await screen.findByText("Во время работы вы заработали:")).toBeTruthy();
    expect(screen.getByLabelText("Серебро: 17").textContent).toBe("17");
    expect(screen.getByLabelText("Светлая карма: 4").textContent).toBe("4");
    expect(claimButton()).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Отменить работу" })).toBeNull();
    expect(screen.queryByText(/зарабатываете себе на жизнь/)).toBeNull();
  });

  it("тёмная карма (грабёж)", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState({ kind: "robbery", silver: 6, karma: -2 }));
    renderAt(FROM_WORK);
    expect((await screen.findByLabelText("Тёмная карма: 2")).textContent).toBe("2");
    expect(screen.queryByLabelText(/Светлая карма/)).toBeNull();
  });

  it("нейтральная работа: карма не указывается", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState({ kind: "field", silver: 19, karma: 0 }));
    renderAt(FROM_WORK);
    expect((await screen.findByLabelText("Серебро: 19")).textContent).toBe("19");
    expect(screen.queryByLabelText(/карма/i)).toBeNull();
  });

  it("«Принять оплату»: запрос, новые параметры в профиле, возврат на «Работа»", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState());
    const stats = { level: 1, silver: 217, karma: { light: 4, dark: 0 } };
    vi.mocked(claimWork).mockResolvedValue(stats);
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Принять оплату" }));

    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
    expect(claimWork).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().user.stats).toEqual(stats);
  });

  it("оплата уже принята (409): профиль обновляется, возврат на «Работа»", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState());
    vi.mocked(claimWork).mockRejectedValue(
      Object.assign(new Error("Награды для получения пока нет"), { code: "NOTHING_TO_CLAIM" }),
    );
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Принять оплату" }));
    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("другая ошибка: показана, страница остаётся", async () => {
    vi.mocked(fetchWork).mockResolvedValue(finishedState());
    vi.mocked(claimWork).mockRejectedValue(new Error("Сбой сервера"));
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Принять оплату" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Сбой сервера");
    expect(claimButton().disabled).toBe(false);
  });
});

describe("WorkProgressPage: сверка с сервером", () => {
  const flush = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

  it("раз в ≤5 с подхватывает смену времени окончания (сдвиг в БД) и показывает оплату", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchWork)
      .mockResolvedValueOnce(state(job()))
      .mockResolvedValueOnce(finishedState());
    renderAt(FROM_WORK);

    await flush(0);
    expect(screen.getByText("01:00:00")).toBeTruthy();
    expect(fetchWork).toHaveBeenCalledTimes(1);

    await flush(4900);
    expect(fetchWork).toHaveBeenCalledTimes(1);
    await flush(200);
    expect(fetchWork).toHaveBeenCalledTimes(2);
    expect(claimButton()).toBeTruthy();
  });

  it("время по часам вышло, сервер ещё не подтвердил — повторяет запрос", async () => {
    vi.useFakeTimers();
    // endsAt уже в прошлом относительно serverTime, но сервер пока говорит finished: false
    const lagging = state(job({ endsAt: iso(T0 - 1000) }));
    vi.mocked(fetchWork)
      .mockResolvedValueOnce(lagging)
      .mockResolvedValueOnce(lagging)
      .mockResolvedValueOnce(finishedState());
    renderAt(FROM_WORK);

    await flush(0);
    expect(screen.queryByRole("button", { name: "Принять оплату" })).toBeNull();
    await flush(1500);
    expect(fetchWork).toHaveBeenCalledTimes(2);
    await flush(1500);
    expect(fetchWork).toHaveBeenCalledTimes(3);
    expect(claimButton()).toBeTruthy();
  });

  it("если работу отменили в другом месте — возврат на «Работа»", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchWork)
      .mockResolvedValueOnce(state(job()))
      .mockResolvedValueOnce(state(null));
    renderAt(FROM_WORK);

    await flush(0);
    await flush(5000);
    expect(screen.getByText("СПИСОК РАБОТ")).toBeTruthy();
  });
});
