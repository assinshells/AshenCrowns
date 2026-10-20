import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { KarmaPage } from "./KarmaPage.jsx";

afterEach(cleanup);

const setKarma = (karma) =>
  useSessionStore.setState({
    status: "authenticated",
    user: { id: 1, login: "hero", stats: karma && { karma } },
  });

const tab = (name) => screen.getByRole("tab", { name });
const counter = () => screen.getByRole("tabpanel").querySelector(".display-4").textContent;

describe("KarmaPage", () => {
  it("по умолчанию обе кармы 0, открыта первая вкладка", () => {
    setKarma(undefined);
    render(<KarmaPage />);
    expect(tab(/Тёмная/).getAttribute("aria-selected")).toBe("true");
    expect(counter()).toBe("0");
    expect(tab(/Светлая/).getAttribute("aria-selected")).toBe("false");
  });

  it("открыта вкладка, где кармы больше: светлая", () => {
    setKarma({ light: 1, dark: 0 });
    render(<KarmaPage />);
    expect(tab(/Светлая/).getAttribute("aria-selected")).toBe("true");
    expect(counter()).toBe("1");
  });

  it("открыта вкладка, где кармы больше: тёмная", () => {
    setKarma({ light: 0, dark: 6 });
    render(<KarmaPage />);
    expect(tab(/Тёмная/).getAttribute("aria-selected")).toBe("true");
    expect(counter()).toBe("6");
  });

  it("вкладки переключаются вручную, у второй счётчик 0", async () => {
    setKarma({ light: 4, dark: 0 });
    render(<KarmaPage />);
    await userEvent.click(tab(/Тёмная/));
    expect(tab(/Тёмная/).getAttribute("aria-selected")).toBe("true");
    expect(counter()).toBe("0");
  });
});
