import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "@features/auth/forgot-password/api/forgotPassword.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ROUTES } from "@shared/constants/routes.js";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/** onSuccess({ email, maskedEmail, resendAfterSeconds }) */
export function ForgotPasswordForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const { loading, error, run } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await run(() => forgotPasswordRequest({ email }));
    if (result) onSuccess({ email, ...result });
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />

      <TextField
        id="email"
        label="Email"
        hint="Если аккаунт с таким адресом существует, мы отправим на него код для восстановления пароля."
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <div className="d-grid mb-3">
        <SubmitButton loading={loading} loadingText="Отправляем…">
          Отправить инструкцию
        </SubmitButton>
      </div>
      <p className="mb-0 text-center">
        <Link to={ROUTES.login}>Вернуться ко входу</Link>
      </p>
    </form>
  );
}
