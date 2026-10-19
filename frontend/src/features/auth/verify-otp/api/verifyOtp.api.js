import { http } from "@shared/api/http.js";

/**
 * Сценарий определяет эндпоинт: публичные (подтверждение email, восстановление
 * пароля) идут в /api/auth, операции авторизованного пользователя — в /api/account.
 */
export const verifyOtpRequest = ({ purpose, email, code }) => {
  switch (purpose) {
    case "change_password":
      return http.post("/api/account/password/confirm", { code }).then((r) => r.data);
    case "change_email":
      return http.post("/api/account/email/confirm", { code }).then((r) => r.data);
    default:
      return http.post("/api/auth/verify-otp", { email, code, purpose }).then((r) => r.data);
  }
};

export const resendOtpRequest = ({ purpose, email }) =>
  purpose === "change_password" || purpose === "change_email"
    ? http.post("/api/account/otp/resend", { purpose }).then((r) => r.data)
    : http.post("/api/auth/resend-otp", { email, purpose }).then((r) => r.data);
