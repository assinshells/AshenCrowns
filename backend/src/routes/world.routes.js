import { Router } from "express";
import { WorldController } from "../controllers/world.controller.js";
import { authGuard } from "../guards/auth.guard.js";
import { RateLimitProvider } from "../providers/rateLimit.provider.js";

const router = Router();

// Только для авторизованного пользователя; только чтение, CSRF-токен не требуется (GET).
router.use(authGuard, RateLimitProvider.world);

router.get("/", WorldController.map);
router.get("/cities/:id", WorldController.city);

export default router;
