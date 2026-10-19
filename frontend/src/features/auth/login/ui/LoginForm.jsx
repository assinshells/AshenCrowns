import { useState } from "react";
import { Link } from "react-router-dom";
import { loginRequest } from "@features/auth/login/api/login.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ROUTES } from "@shared/constants/routes.js";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/**
 * onSuccess(user)                   — вход выполнен (сессия создана сервером);
 * onUnverified({ email, maskedEmail }) — пароль верный, но email ещё не подтверждён.
 */
export function LoginForm({ onSuccess, onUnverified }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loading, error, run } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await run(async () => {
      try {
        return await loginRequest({ email, password });
      } catch (err) {
        if (err.code === "EMAIL_NOT_VERIFIED") {
          onUnverified({ email, maskedEmail: err.extra.maskedEmail });
          return null;
        }
        throw err;
      }
    });
    if (user) onSuccess(user);
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />

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
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div className="d-grid mb-3">
        <SubmitButton loading={loading} loadingText="Входим…">
          Войти
        </SubmitButton>
      </div>
      <p className="mb-1 text-center">
        <Link to={ROUTES.forgotPassword}>Забыли пароль?</Link>
      </p>
      <p className="mb-0 text-center">
        Нет аккаунта? <Link to={ROUTES.register}>Зарегистрироваться</Link>
      </p>
    </form>
  );
}
