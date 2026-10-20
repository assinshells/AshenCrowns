import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@widgets/layouts";
import { RegisterForm } from "@features/auth/register/ui/RegisterForm.jsx";
import { ROUTES } from "@shared/constants/routes.js";

export function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = ({ email, requiresEmailVerification, maskedEmail, resendAfterSeconds }) => {
    if (requiresEmailVerification) {
      navigate(ROUTES.verifyOtp, {
        state: { purpose: "verify_email", email, maskedEmail, initialCooldown: resendAfterSeconds },
      });
    } else {
      navigate(ROUTES.login, { state: { notice: "Аккаунт создан. Теперь можно войти." } });
    }
  };

  return (
    <AuthLayout
      title="Регистрация"
      links={
        <p className="mb-0">
          Уже есть аккаунт? <Link to={ROUTES.login}>Войти</Link>
        </p>
      }
    >
      <RegisterForm onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
