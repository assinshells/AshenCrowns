import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@widgets/layouts";
import { OtpForm } from "@features/auth/verify-otp/ui/OtpForm.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { OTP_SCENARIOS } from "@shared/constants/app.js";
import { ROUTES } from "@shared/constants/routes.js";
import { Notice } from "@shared/ui/Notice.jsx";

/**
 * Универсальная страница подтверждения кодом. Сценарий (purpose) явно
 * показан в заголовке и описании. Данные приходят из state навигации.
 */
export function VerifyOtpPage() {
  const navigate = useNavigate();
  const state = useLocation().state;
  const status = useSessionStore((s) => s.status);
  const clear = useSessionStore((s) => s.clear);
  const load = useSessionStore((s) => s.load);

  const scenario = OTP_SCENARIOS[state?.purpose];
  if (!scenario) return <Navigate to={ROUTES.login} replace />;
  if (scenario.requiresAuth && status !== "authenticated") {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (!scenario.requiresAuth && status === "authenticated") {
    return <Navigate to={ROUTES.home} replace />;
  }

  const { purpose, email, maskedEmail, initialCooldown } = state;

  const handleVerified = async (result) => {
    switch (purpose) {
      case "verify_email":
        navigate(ROUTES.login, {
          replace: true,
          state: { notice: "Email подтверждён. Теперь можно войти." },
        });
        break;
      case "reset_password":
        navigate(ROUTES.resetPassword, { replace: true, state: { resetToken: result.resetToken } });
        break;
      case "change_password":
        // Сервер завершил все сессии и очистил cookie — повторный вход обязателен.
        clear();
        navigate(ROUTES.login, {
          replace: true,
          state: { notice: "Пароль изменён. Войдите, используя новый пароль." },
        });
        break;
      case "change_email":
        await load(); // перечитываем профиль с сервера
        navigate(ROUTES.settingsSecurity, {
          replace: true,
          state: { notice: "Email успешно изменён. На прежний адрес отправлено уведомление." },
        });
        break;
    }
  };

  return (
    <AuthLayout
      title={scenario.title}
      description={scenario.description}
      links={
        <p className="mb-0">
          <Link to={scenario.requiresAuth ? ROUTES.settingsSecurity : ROUTES.login}>
            {scenario.requiresAuth ? "Отмена" : "Вернуться ко входу"}
          </Link>
        </p>
      }
    >
      {state.unverified && (
        <Notice variant="warning">
          Email ещё не подтверждён. Введите код из письма или запросите новый.
        </Notice>
      )}
      <OtpForm
        purpose={purpose}
        email={email}
        maskedEmail={maskedEmail}
        initialCooldown={initialCooldown}
        onVerified={handleVerified}
      />
    </AuthLayout>
  );
}
