import { Router } from "express";
import { WorkController } from "../controllers/work.controller.js";
import { authGuard } from "../guards/auth.guard.js";
import { RateLimitProvider } from "../providers/rateLimit.provider.js";

const router = Router();

// Только для авторизованного пользователя; CSRF проверяется глобально (app.js).
router.use(authGuard, RateLimitProvider.work);

router.get("/", WorkController.state);
router.post("/start", WorkController.start);
router.post("/cancel", WorkController.cancel);

export default router;
