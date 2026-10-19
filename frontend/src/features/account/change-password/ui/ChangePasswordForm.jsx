import { useState } from "react";
import { requestPasswordChange } from "@features/account/change-password/api/changePassword.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ApiError } from "@shared/api/http.js";
import { PASSWORD_RULES } from "@shared/constants/app.js";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/** Шаг 1: проверка текущего пароля и отправка кода. onRequested({ maskedEmail, resendAfterSeconds }) */
export function ChangePasswordForm({ maskedEmail, onRequested }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { loading, error, run, setError } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(new ApiError("Пароли не совпадают"));
      return;
    }
    const result = await run(() =>
      requestPasswordChange({ currentPassword, newPassword, confirmPassword }),
    );
    if (result) onRequested(result);
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />

      <div className="mb-3">
        <label htmlFor="pw-current-email" className="form-label">
          Текущий email
        </label>
        <input
          id="pw-current-email"
          className="form-control-plaintext"
          value={maskedEmail}
          readOnly
        />
        <div className="form-text">На этот адрес будет отправлен код подтверждения.</div>
      </div>

      <TextField
        id="pw-current"
        label="Текущий пароль"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <TextField
        id="pw-new"
        label="Новый пароль"
        hint={PASSWORD_RULES.hint}
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        minLength={PASSWORD_RULES.min}
        maxLength={PASSWORD_RULES.max}
        required
      />
      <TextField
        id="pw-confirm"
        label="Подтверждение нового пароля"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <SubmitButton loading={loading} loadingText="Отправляем код…">
        Изменить пароль
      </SubmitButton>
    </form>
  );
}
