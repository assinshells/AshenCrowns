import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { authConfig } from "../config/auth.config.js";
import { redisClient } from "../config/redis.js";
import { REDIS_KEYS } from "../constants/auth.constants.js";
import { RateLimitException } from "../exceptions/auth.exceptions.js";

/**
 * Лимитеры используют Redis как общее хранилище, поэтому счётчики
 * переживают рестарт и работают при нескольких инстансах backend.
 *
 * Инициализация ленивая: RedisStore сразу отправляет команды в Redis,
 * а клиент подключается позже (см. server.js), чем импортируются модули.
 */
const makeRateLimiter = (name, max, keyGenerator) => {
  let limiter;
  return (req, res, next) => {
    limiter ??= rateLimit({
      windowMs: authConfig.rateLimit.windowMs,
      limit: max,
      standardHeaders: true,
      legacyHeaders: false,
      // Создание лимитера при первом запросе — осознанное (см. комментарий выше).
      validate: { creationStack: false },
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: REDIS_KEYS.rateLimit(name),
      }),
      ...(keyGenerator ? { keyGenerator } : {}),
      handler: (_req, _res, nextFn) => nextFn(new RateLimitException()),
    });
    return limiter(req, res, next);
  };
};

const { rateLimit: cfg } = authConfig;

export const RateLimitProvider = {
  login: makeRateLimiter("login", cfg.loginMax),
  register: makeRateLimiter("register", cfg.registerMax),
  forgotPassword: makeRateLimiter("forgot", cfg.forgotMax),
  verifyOtp: makeRateLimiter("verify_otp", cfg.otpMax),
  resendOtp: makeRateLimiter("resend_otp", cfg.resendMax),
  resetPassword: makeRateLimiter("reset", cfg.resetMax),
  // Для авторизованных операций лимит считается по userId, а не по IP.
  account: makeRateLimiter("account", cfg.accountMax, (req) => `u:${req.user.id}`),
  // Игровые действия (повышение характеристик): лимит мягче, но тоже по userId.
  character: makeRateLimiter("character", cfg.characterMax, (req) => `u:${req.user.id}`),
  work: makeRateLimiter("work", cfg.workMax, (req) => `u:${req.user.id}`),
  world: makeRateLimiter("world", cfg.worldMax, (req) => `u:${req.user.id}`),
};
