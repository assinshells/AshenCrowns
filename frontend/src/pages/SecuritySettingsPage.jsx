import { useLocation, useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "@features/account/change-password/ui/ChangePasswordForm.jsx";
import { ChangeEmailForm } from "@features/account/change-email/ui/ChangeEmailForm.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { ROUTES } from "@shared/constants/routes.js";
import { Notice } from "@shared/ui/Notice.jsx";

export function SecuritySettingsPage() {
  const navigate = useNavigate();
  const notice = useLocation().state?.notice;
  const maskedEmail = useSessionStore((s) => s.user?.maskedEmail);

  const goToOtp = (purpose) => ({ maskedEmail: maskedEmailOfCode, resendAfterSeconds }) =>
    navigate(ROUTES.verifyOtp, {
      state: { purpose, maskedEmail: maskedEmailOfCode, initialCooldown: resendAfterSeconds },
    });

  return (
    <>
      <Notice>{notice}</Notice>
      <div className="row g-4">
        <section className="col-12 col-xl-6" aria-labelledby="change-password-title">
          <div className="card">
            <div className="card-body">
              <h2 id="change-password-title" className="h5 card-title">Смена пароля</h2>
              <p className="text-body-secondary">
                После смены пароля все активные сессии будут завершены, потребуется повторный вход.
              </p>
              <ChangePasswordForm maskedEmail={maskedEmail} onRequested={goToOtp("change_password")} />
            </div>
          </div>
        </section>
        <section className="col-12 col-xl-6" aria-labelledby="change-email-title">
          <div className="card">
            <div className="card-body">
              <h2 id="change-email-title" className="h5 card-title">Смена email</h2>
              <p className="text-body-secondary">
                Основной адрес изменится только после подтверждения нового адреса кодом.
              </p>
              <ChangeEmailForm maskedEmail={maskedEmail} onRequested={goToOtp("change_email")} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
