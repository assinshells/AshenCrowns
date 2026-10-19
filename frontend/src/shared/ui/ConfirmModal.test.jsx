import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "./ConfirmModal.jsx";

afterEach(cleanup);

const setup = (props) =>
  render(
    <ConfirmModal open title="Удалить?" onConfirm={vi.fn()} onCancel={vi.fn()} {...props}>
      Текст
    </ConfirmModal>,
  );

describe("ConfirmModal", () => {
  it("закрыто — ничего не рендерит", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«Да» подтверждает, «Нет» и Escape отменяют", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    setup({ onConfirm, onCancel });

    await user.click(screen.getByRole("button", { name: "Да" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Нет" }));
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("во время загрузки отмена заблокирована", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    setup({ loading: true, onCancel });
    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Нет" }).disabled).toBe(true);
  });
});
