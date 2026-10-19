import { useState } from "react";
import { Link } from "react-router-dom";
import { registerRequest } from "@features/auth/register/api/register.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { passwordsMatch } from "@shared/lib/passwords.js";
import { ROUTES } from "@shared/constants/routes.js";
import { LOGIN_RULES, PASSWORD_RULES } from "@shared/constants/app.js";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/** onSuccess({ email, requiresEmailVerification, maskedEmail, resendAfterSeconds }) */
export function RegisterForm({ onSuccess }) {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { loading, error, run, setError } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordsMatch(password, confirmPassword, setError)) return;
    const result = await run(() =>
      registerRequest({ login, email, password, confirmPassword }),
    );
    if (result) onSuccess({ email, ...result });
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />

      <TextField
        id="login"
        label="Логин"
        hint={LOGIN_RULES.hint}
        type="text"
        autoComplete="username"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        minLength={LOGIN_RULES.min}
        maxLength={LOGIN_RULES.max}
        pattern={LOGIN_RULES.pattern}
        required
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        id="password"
        label="Пароль"
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
        <SubmitButton loading={loading} loadingText="Регистрируем…">
          Зарегистрироваться
        </SubmitButton>
      </div>
      <p className="mb-0 text-center">
        Уже есть аккаунт? <Link to={ROUTES.login}>Войти</Link>
      </p>
    </form>
  );
}
