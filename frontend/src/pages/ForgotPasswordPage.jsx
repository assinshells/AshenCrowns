import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@widgets/layouts";
import { ForgotPasswordForm } from "@features/auth/forgot-password/ui/ForgotPasswordForm.jsx";
import { ROUTES } from "@shared/constants/routes.js";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Восстановление пароля"
      links={
        <p className="mb-0">
          <Link to={ROUTES.login}>Вернуться ко входу</Link>
        </p>
      }
    >
      <ForgotPasswordForm
        onSuccess={({ email, maskedEmail, resendAfterSeconds }) =>
          navigate(ROUTES.verifyOtp, {
            state: { purpose: "reset_password", email, maskedEmail, initialCooldown: resendAfterSeconds },
          })
        }
      />
    </AuthLayout>
  );
}
