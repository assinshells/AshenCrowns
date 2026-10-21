import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { UserMenu } from "./UserMenu.jsx";

beforeEach(() => {
  useSessionStore.setState({ status: "authenticated", user: { login: "Ворон", avatarPath: null } });
});
afterEach(cleanup);

const renderMenu = () =>
  render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  );

describe("UserMenu", () => {
  it("показывает имя и уровень, меню закрыто", () => {
    renderMenu();
    expect(screen.getByText("Ворон")).toBeTruthy();
    expect(screen.getByText("Уровень 1")).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("открывает «Герой», «Настройки» и «Выход», закрывается по Escape", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("menuitem", { name: "Герой" }).getAttribute("href")).toBe("/hero");
    expect(screen.getByRole("menuitem", { name: "Настройки" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Выход" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
