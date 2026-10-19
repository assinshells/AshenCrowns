import { useState } from "react";
import { Link } from "react-router-dom";
import { resetPasswordRequest } from "@features/auth/reset-password/api/resetPassword.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ApiError } from "@shared/api/http.js";
import { ROUTES } from "@shared/constants/routes.js";
import { PASSWORD_RULES } from "@shared/constants/app.js";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

export function ResetPasswordForm({ resetToken, onSuccess }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { loading, error, run, setError } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(new ApiError("Пароли не совпадают"));
      return;
    }
    const result = await run(() =>
      resetPasswordRequest({ resetToken, password, confirmPassword }),
    );
    if (result) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />
      {error?.code === "RESET_TOKEN_INVALID" && (
        <p>
          <Link to={ROUTES.forgotPassword}>Запросить восстановление заново</Link>
        </p>
      )}

      <TextField
        id="password"
        label="Новый пароль"
        hint={PASSWORD_RULES.hint}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={PASSWORD_RULES.min}
        maxLength={PASSWORD_RULES.max}
        required
      />
      <TextField
        id="confirmPassword"
        label="Подтверждение пароля"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      <div className="d-grid mb-3">
        <SubmitButton loading={loading} loadingText="Сохраняем…">
          Сохранить пароль
        </SubmitButton>
      </div>
      <p className="mb-0 text-center">
        <Link to={ROUTES.login}>Вернуться ко входу</Link>
      </p>
    </form>
  );
}
