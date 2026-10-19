import { Route, Routes } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";
import { ProtectedRoute, PublicOnlyRoute } from "./guards.jsx";
import { AppLayout, SettingsLayout } from "@widgets/layouts";

import { LoginPage } from "@pages/LoginPage.jsx";
import { RegisterPage } from "@pages/RegisterPage.jsx";
import { ForgotPasswordPage } from "@pages/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "@pages/ResetPasswordPage.jsx";
import { VerifyOtpPage } from "@pages/VerifyOtpPage.jsx";
import { HomePage } from "@pages/HomePage.jsx";
import { HeroPage } from "@pages/HeroPage.jsx";
import { SecuritySettingsPage } from "@pages/SecuritySettingsPage.jsx";
import { NotificationsSettingsPage } from "@pages/NotificationsSettingsPage.jsx";
import { StubPage } from "@pages/StubPage.jsx";
import { NotFoundPage } from "@pages/NotFoundPage.jsx";
import { APP_VERSION } from "@shared/constants/app.js";

export function AppRouter() {
  return (
    <Routes>
      {/* Публичные: только для неавторизованных */}
      <Route element={<PublicOnlyRoute />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
      </Route>

      {/* Подтверждение OTP: сценарии смены пароля/email требуют сессии (проверяется на странице) */}
      <Route path={ROUTES.verifyOtp} element={<VerifyOtpPage />} />

      {/* Защищённые */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.hero} element={<HeroPage />} />
          <Route element={<SettingsLayout />}>
            <Route path={ROUTES.settingsSecurity} element={<SecuritySettingsPage />} />
            <Route path={ROUTES.settingsNotifications} element={<NotificationsSettingsPage />} />
          </Route>
          <Route path={ROUTES.about} element={<StubPage />} />
          <Route path={ROUTES.rules} element={<StubPage />} />
          <Route path={ROUTES.support} element={<StubPage />} />
          <Route
            path={ROUTES.version}
            element={<StubPage>Версия приложения: {APP_VERSION}</StubPage>}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
