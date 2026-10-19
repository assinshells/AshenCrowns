import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@widgets/layouts";
import { ResetPasswordForm } from "@features/auth/reset-password/ui/ResetPasswordForm.jsx";
import { ROUTES } from "@shared/constants/routes.js";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const resetToken = useLocation().state?.resetToken;

  // Токен восстановления выдаётся только после подтверждения кода и живёт в
  // state навигации (не в URL — не попадает в историю, логи и Referer).
  if (!resetToken) return <Navigate to={ROUTES.forgotPassword} replace />;

  return (
    <AuthLayout title="Новый пароль" description="Код подтверждён. Задайте новый пароль.">
      <ResetPasswordForm
        resetToken={resetToken}
        onSuccess={() =>
          navigate(ROUTES.login, {
            replace: true,
            state: { notice: "Пароль изменён. Войдите, используя новый пароль." },
          })
        }
      />
    </AuthLayout>
  );
}
