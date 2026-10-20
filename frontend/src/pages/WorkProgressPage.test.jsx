import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { cancelWork, fetchWork } from "@entities/work/api/work.api.js";
import { WorkProgressPage } from "./WorkProgressPage.jsx";

vi.mock("@entities/work/api/work.api.js", () => ({
  fetchWork: vi.fn(),
  cancelWork: vi.fn(),
}));

const T0 = Date.parse("2026-10-20T10:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();

const job = (over = {}) => ({
  id: 7,
  kind: "gate",
  hours: 8,
  silver: 17,
  karma: 4,
  status: "active",
  startedAt: iso(T0),
  endsAt: iso(T0 + 3600 * 1000),
  ...over,
});
const state = (active, last = null, serverTime = iso(T0)) => ({
  jobs: [],
  active,
  last,
  serverTime,
});

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

let load;
beforeEach(() => {
  vi.mocked(fetchWork).mockReset();
  vi.mocked(cancelWork).mockReset();
  load = vi.fn().mockResolvedValue(undefined);
  useSessionStore.setState({ status: "authenticated", user: { id: 1, login: "hero" }, load });
});
afterEach(cleanup);

describe("WorkProgressPage", () => {
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

  it("показывает оставшееся серверное время, прогресс и награду", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job()));
    renderAt(FROM_WORK);

    expect(await screen.findByText("01:00:00")).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Прогресс работы" });
    expect(bar.getAttribute("max")).toBe(String(3600 * 1000));
    expect(screen.getByText("Серебро по окончании").nextSibling.textContent).toBe("17");
    expect(screen.getByText("Светлая карма").nextSibling.textContent).toBe("4");
  });

  it("отсчёт идёт по серверному времени, а не по часам браузера", async () => {
    // Сервер «ушёл вперёд» на 30 минут относительно активной работы: осталось полчаса.
    vi.mocked(fetchWork).mockResolvedValue(state(job(), null, iso(T0 + 1800 * 1000)));
    renderAt(FROM_WORK);
    expect(await screen.findByText("00:30:00")).toBeTruthy();
  });

  it("отмена: подтверждение, запрос, обновление профиля и возврат на «Работа»", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job()));
    vi.mocked(cancelWork).mockResolvedValue({ success: true, cancelled: true });
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Отменить работу" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("зачислены не будут");
    await userEvent.click(within(dialog).getByRole("button", { name: "Отменить работу" }));

    expect(await screen.findByText("СПИСОК РАБОТ")).toBeTruthy();
    expect(cancelWork).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalled();
  });

  it("«Продолжить работу» закрывает окно, работа не отменяется", async () => {
    vi.mocked(fetchWork).mockResolvedValue(state(job()));
    renderAt(FROM_WORK);

    await userEvent.click(await screen.findByRole("button", { name: "Отменить работу" }));
    await userEvent.click(screen.getByRole("button", { name: "Продолжить работу" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelWork).not.toHaveBeenCalled();
  });

  it("время вышло: награда зачислена, показан итог и обновлён профиль", async () => {
    // Серверное время уже за концом работы → страница спрашивает итог у сервера.
    const done = job({ status: "completed" });
    vi.mocked(fetchWork)
      .mockResolvedValueOnce(state(job(), null, iso(T0 + 3601 * 1000)))
      .mockResolvedValueOnce(state(null, done, iso(T0 + 3602 * 1000)));
    renderAt(FROM_WORK);

    expect(await screen.findByText(/работа завершена/)).toBeTruthy();
    expect(screen.getByText("Серебро").nextSibling.textContent).toBe("17");
    expect(screen.getByText("Светлая карма").nextSibling.textContent).toBe("4");
    expect(load).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "К списку работ" }));
    await waitFor(() => expect(screen.getByText("СПИСОК РАБОТ")).toBeTruthy());
  });
});
