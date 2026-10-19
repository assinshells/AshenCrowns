import { useEffect, useState } from "react";
import { verifyOtpRequest, resendOtpRequest } from "@features/auth/verify-otp/api/verifyOtp.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { OTP_LENGTH } from "@shared/constants/app.js";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { Notice } from "@shared/ui/Notice.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/**
 * Ввод одноразового кода — ОДНО поле (inputMode="numeric",
 * autoComplete="one-time-code"): подходит для автозаполнения из SMS/почты
 * и вставки целиком.
 *
 * Props:
 *  purpose, email    — сценарий и (для публичных сценариев) email;
 *  maskedEmail       — маска адреса, на который отправлен код;
 *  initialCooldown   — секунд до разрешения повторной отправки;
 *  onVerified(result)— код принят сервером.
 */
export function OtpForm({ purpose, email, maskedEmail, initialCooldown = 0, onVerified }) {
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [resent, setResent] = useState(false);
  const verify = useRequest();
  const resend = useRequest();

  // Обратный отсчёт до возможности повторной отправки.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleChange = (e) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH));
    verify.clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await verify.run(() => verifyOtpRequest({ purpose, email, code }));
    if (result) onVerified(result);
  };

  const handleResend = async () => {
    setResent(false);
    verify.clearError();
    const result = await resend.run(async () => {
      try {
        return await resendOtpRequest({ purpose, email });
      } catch (err) {
        // Сервер — источник истины о паузе: при 429 берём остаток оттуда.
        const retry = err.extra?.retryAfterSeconds;
        if (err.code === "OTP_RESEND_COOLDOWN" && retry) setCooldown(retry);
        throw err;
      }
    });
    if (result) {
      setCode("");
      setResent(true);
      setCooldown(result.resendAfterSeconds ?? 60);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={verify.loading}>
      <p>
        Код отправлен на <strong>{maskedEmail}</strong>.
      </p>

      <ErrorAlert error={verify.error} />
      {resend.error?.code !== "OTP_RESEND_COOLDOWN" && <ErrorAlert error={resend.error} />}
      {resent && <Notice>Новый код отправлен.</Notice>}

      <div className="mb-3">
        <label htmlFor="otp" className="form-label">
          Код подтверждения
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={OTP_LENGTH}
          className="form-control form-control-lg text-center"
          aria-describedby="otp-hint"
          value={code}
          onChange={handleChange}
          autoFocus
          required
        />
        <div id="otp-hint" className="form-text">
          {OTP_LENGTH} цифр. Код действует 10 минут и может быть использован один раз.
        </div>
      </div>

      <div className="d-grid mb-3">
        <SubmitButton
          loading={verify.loading}
          loadingText="Проверяем…"
          disabled={code.length !== OTP_LENGTH}
        >
          Подтвердить
        </SubmitButton>
      </div>

      <div className="text-center">
        <button
          type="button"
          className="btn btn-link"
          onClick={handleResend}
          disabled={cooldown > 0 || resend.loading}
        >
          {cooldown > 0
            ? `Отправить код повторно через ${cooldown} с`
            : "Отправить код повторно"}
        </button>
      </div>
    </form>
  );
}
