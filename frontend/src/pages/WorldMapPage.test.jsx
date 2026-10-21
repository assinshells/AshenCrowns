import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorldMapPage } from "./WorldMapPage.jsx";

afterEach(cleanup);

describe("WorldMapPage", () => {
  it("Терент раскрыт, отмечен как текущий, работы со средней оплатой без коэффициентов", () => {
    render(<WorldMapPage />);
    expect(screen.getByText("Вы находитесь здесь")).toBeTruthy();
    for (const job of ["Охрана ворот", "Работа в поле", "Грабёж"]) {
      expect(screen.getByText(job)).toBeTruthy();
    }
    expect(screen.getAllByText(/Средняя оплата/)).toHaveLength(3);
    expect(screen.queryByText(/×/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Работы" })).toBeNull();
    const items = screen.getAllByRole("listitem");
    const last = items[items.length - 1];
    expect(last.textContent).toBe("Цены на вещиНизкие");
  });

  it("список сворачивается и разворачивается", async () => {
    render(<WorldMapPage />);
    const toggle = screen.getByRole("button", { name: /Терент/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
