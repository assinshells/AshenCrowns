import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authGuard } from "../guards/auth.guard.js";
import { RateLimitProvider } from "../providers/rateLimit.provider.js";

const router = Router();

// Выдаёт CSRF-токен (cookie + тело). Изменяющие запросы без него отклоняются
// глобальным csrfProtection (см. app.js).
router.get("/csrf", AuthController.csrf);

router.post("/register", RateLimitProvider.register, AuthController.register);
router.post("/login", RateLimitProvider.login, AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", authGuard, AuthController.me);

router.post(
  "/forgot-password",
  RateLimitProvider.forgotPassword,
  AuthController.forgotPassword,
);
router.post(
  "/verify-otp",
  RateLimitProvider.verifyOtp,
  AuthController.verifyOtp,
);
router.post(
  "/resend-otp",
  RateLimitProvider.resendOtp,
  AuthController.resendOtp,
);
router.post(
  "/reset-password",
  RateLimitProvider.resetPassword,
  AuthController.resetPassword,
);

export default router;
