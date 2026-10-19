import { Router } from "express";
import { AccountController } from "../controllers/account.controller.js";
import { authGuard } from "../guards/auth.guard.js";
import { RateLimitProvider } from "../providers/rateLimit.provider.js";

const router = Router();

// Все маршруты — только для авторизованного пользователя (серверная сессия).
router.use(authGuard, RateLimitProvider.account);

router.post("/password/request", AccountController.requestPasswordChange);
router.post("/password/confirm", AccountController.confirmPasswordChange);
router.post("/email/request", AccountController.requestEmailChange);
router.post("/email/confirm", AccountController.confirmEmailChange);
router.post("/delete", AccountController.deleteAccount);
router.post("/otp/resend", AccountController.resendCode);

export default router;
