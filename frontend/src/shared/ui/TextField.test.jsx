import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "./TextField.jsx";

afterEach(cleanup);

describe("TextField", () => {
  it("для пароля показывает/скрывает значение по кнопке-глазу", async () => {
    const user = userEvent.setup();
    render(<TextField id="p" label="Пароль" type="password" />);
    const input = screen.getByLabelText("Пароль");
    expect(input.getAttribute("type")).toBe("password");

    await user.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(input.getAttribute("type")).toBe("text");

    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(input.getAttribute("type")).toBe("password");
  });

  it("для обычных полей кнопки нет", () => {
    render(<TextField id="e" label="Email" type="email" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
