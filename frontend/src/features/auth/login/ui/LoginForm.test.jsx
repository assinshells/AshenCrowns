import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm.jsx";
import { ApiError } from "@shared/api/http.js";

vi.mock("@features/auth/login/api/login.api.js", () => ({ loginRequest: vi.fn() }));
import { loginRequest } from "@features/auth/login/api/login.api.js";

const setup = (props) =>
  render(
    <MemoryRouter>
      <LoginForm onSuccess={vi.fn()} onUnverified={vi.fn()} {...props} />
    </MemoryRouter>,
  );

const fill = async (user) => {
  await user.type(screen.getByLabelText("Email"), "me@example.com");
  await user.type(screen.getByLabelText("Пароль"), "Str0ngPassword_1");
  await user.click(screen.getByRole("button", { name: "Войти" }));
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("LoginForm", () => {
  it("содержит email, пароль и ссылку «Забыли пароль?» (регистрация — под карточкой, в LoginPage)", () => {
    setup();
    expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
    expect(screen.getByLabelText("Пароль").getAttribute("type")).toBe("password");
    expect(screen.getByRole("link", { name: "Забыли пароль?" }).getAttribute("href")).toBe("/forgot-password");
    expect(screen.queryByRole("link", { name: "Зарегистрироваться" })).toBeNull();
  });

  it("успешный вход → onSuccess(user)", async () => {
    const user = userEvent.setup();
    loginRequest.mockResolvedValue({ login: "hero" });
    const onSuccess = vi.fn();
    setup({ onSuccess });
    await fill(user);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ login: "hero" }));
  });

  it("неверные данные → сообщение об ошибке, без onSuccess", async () => {
    const user = userEvent.setup();
    loginRequest.mockRejectedValue(new ApiError("Неверный email или пароль", { code: "AUTHENTICATION_FAILED", status: 401 }));
    const onSuccess = vi.fn();
    setup({ onSuccess });
    await fill(user);
    expect((await screen.findByRole("alert")).textContent).toContain("Неверный email или пароль");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("email не подтверждён → onUnverified с маской", async () => {
    const user = userEvent.setup();
    loginRequest.mockRejectedValue(
      new ApiError("Email не подтверждён", { code: "EMAIL_NOT_VERIFIED", status: 403, extra: { maskedEmail: "m***e@e***e.com" } }),
    );
    const onUnverified = vi.fn();
    setup({ onUnverified });
    await fill(user);
    await waitFor(() => expect(onUnverified).toHaveBeenCalledWith({ email: "me@example.com", maskedEmail: "m***e@e***e.com" }));
  });
});
