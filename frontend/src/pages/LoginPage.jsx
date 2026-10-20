import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@widgets/layouts";
import { LoginForm } from "@features/auth/login/ui/LoginForm.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { ROUTES } from "@shared/constants/routes.js";
import { getSafeRedirect } from "@shared/lib/safeRedirect.js";
import { Notice } from "@shared/ui/Notice.jsx";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useSessionStore((s) => s.setUser);

  const handleSuccess = (user) => {
    setUser(user);
    navigate(getSafeRedirect(location.state?.from), { replace: true });
  };

  const handleUnverified = ({ email, maskedEmail }) =>
    navigate(ROUTES.verifyOtp, {
      state: { purpose: "verify_email", email, maskedEmail, initialCooldown: 0, unverified: true },
    });

  return (
    <AuthLayout
      title="Вход"
      links={
        <p className="mb-0">
          Нет аккаунта? <Link to={ROUTES.register}>Зарегистрироваться</Link>
        </p>
      }
    >
      <Notice>{location.state?.notice}</Notice>
      <LoginForm onSuccess={handleSuccess} onUnverified={handleUnverified} />
    </AuthLayout>
  );
}
