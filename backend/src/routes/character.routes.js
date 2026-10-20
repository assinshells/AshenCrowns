import { Router } from "express";
import { CharacterController } from "../controllers/character.controller.js";
import { authGuard } from "../guards/auth.guard.js";
import { RateLimitProvider } from "../providers/rateLimit.provider.js";

const router = Router();

// Только для авторизованного пользователя; CSRF проверяется глобально (app.js).
router.use(authGuard, RateLimitProvider.character);

router.post("/attributes/upgrade", CharacterController.upgradeAttribute);

export default router;
