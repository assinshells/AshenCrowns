import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpForm } from "./OtpForm.jsx";
import { ApiError } from "@shared/api/http.js";

vi.mock("@features/auth/verify-otp/api/verifyOtp.api.js", () => ({
  verifyOtpRequest: vi.fn(),
  resendOtpRequest: vi.fn(),
}));
import { verifyOtpRequest, resendOtpRequest } from "@features/auth/verify-otp/api/verifyOtp.api.js";

const setup = (props = {}) =>
  render(<OtpForm purpose="verify_email" email="a@b.com" maskedEmail="a***@b***.com" onVerified={vi.fn()} {...props} />);

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("OtpForm", () => {
  it("одно поле: inputMode=numeric и autocomplete=one-time-code (не 6 отдельных)", () => {
    setup();
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute("inputmode")).toBe("numeric");
    expect(inputs[0].getAttribute("autocomplete")).toBe("one-time-code");
    expect(inputs[0].getAttribute("maxlength")).toBe("6");
  });

  it("показывает только маску email", () => {
    setup();
    expect(screen.getByText("a***@b***.com")).toBeTruthy();
    expect(document.body.textContent).not.toContain("a@b.com");
  });

  it("оставляет только цифры, не более 6; кнопка активна лишь при 6 цифрах", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByLabelText("Код подтверждения");
    const submit = screen.getByRole("button", { name: "Подтвердить" });
    await user.type(input, "12a3-4");
    expect(input.value).toBe("1234");
    expect(submit.disabled).toBe(true);
    await user.paste("56789");
    expect(input.value).toBe("123456");
    expect(submit.disabled).toBe(false);
  });

  it("при верном коде вызывает onVerified с ответом сервера", async () => {
    const user = userEvent.setup();
    verifyOtpRequest.mockResolvedValue({ verified: true });
    const onVerified = vi.fn();
    setup({ onVerified });
    await user.type(screen.getByLabelText("Код подтверждения"), "123456");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith({ verified: true }));
    expect(verifyOtpRequest).toHaveBeenCalledWith({ purpose: "verify_email", email: "a@b.com", code: "123456" });
  });

  it("показывает сообщение об истечении срока действия", async () => {
    const user = userEvent.setup();
    verifyOtpRequest.mockRejectedValue(
      new ApiError("Срок действия кода истёк или код не найден. Запросите новый код.", { code: "OTP_EXPIRED", status: 400 }),
    );
    setup();
    await user.type(screen.getByLabelText("Код подтверждения"), "123456");
    await user.click(screen.getByRole("button", { name: "Подтвердить" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Срок действия кода истёк");
  });

  it("повторная отправка заблокирована на время паузы и разрешается по её окончании", async () => {
    setup({ initialCooldown: 2 });
    expect(screen.getByRole("button", { name: /Отправить код повторно через 2 с/ }).disabled).toBe(true);
    const ready = await screen.findByRole("button", { name: "Отправить код повторно" }, { timeout: 4000 });
    expect(ready.disabled).toBe(false);
  });

  it("повторная отправка: запрос, уведомление и новая пауза", async () => {
    const user = userEvent.setup();
    resendOtpRequest.mockResolvedValue({ resendAfterSeconds: 60 });
    setup();
    await user.click(screen.getByRole("button", { name: "Отправить код повторно" }));
    expect(await screen.findByText("Новый код отправлен.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /через 60 с/ }).disabled).toBe(true);
  });

  it("при 429 берёт остаток паузы с сервера", async () => {
    const user = userEvent.setup();
    resendOtpRequest.mockRejectedValue(
      new ApiError("Повторная отправка будет доступна через 41 с", {
        code: "OTP_RESEND_COOLDOWN", status: 429, extra: { retryAfterSeconds: 41 },
      }),
    );
    setup();
    await user.click(screen.getByRole("button", { name: "Отправить код повторно" }));
    expect(await screen.findByRole("button", { name: /через 41 с/ })).toBeTruthy();
  });
});
