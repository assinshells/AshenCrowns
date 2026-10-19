import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./guards.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<p>login page</p>} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<p>secret game data</p>} />
          <Route path="/settings/security" element={<p>secret settings</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  useSessionStore.setState({ status: "loading", user: null });
});

describe("guards", () => {
  it("аноним на защищённой странице → /login, защищённые данные не показываются", () => {
    useSessionStore.setState({ status: "anonymous", user: null });
    renderAt("/settings/security");
    expect(screen.getByText("login page")).toBeTruthy();
    expect(screen.queryByText("secret settings")).toBeNull();
  });

  it("авторизованный видит защищённую страницу, а /login перенаправляет на /", () => {
    useSessionStore.setState({ status: "authenticated", user: { login: "x" } });
    renderAt("/");
    expect(screen.getByText("secret game data")).toBeTruthy();
    cleanup();
    renderAt("/login");
    expect(screen.getByText("secret game data")).toBeTruthy();
  });
});
