import crypto from "crypto";
import { COOKIE_NAMES } from "../constants/auth.constants.js";
import { CsrfException } from "../exceptions/auth.exceptions.js";
import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const allowedOrigin = (() => {
  try {
    return new URL(env.clientUrl).origin;
  } catch {
    return null;
  }
})();

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * csrfProtection — защита от CSRF для ВСЕХ изменяющих запросов
 * (включая login/register: защищает и от login-CSRF).
 *
 *  1. Если браузер прислал Origin — он обязан совпадать с CLIENT_URL.
 *  2. Double-submit: значение cookie ac_csrf должно совпасть с заголовком
 *     X-CSRF-Token. Чужой сайт может заставить браузер отправить cookie,
 *     но не может её прочитать и подставить заголовок.
 *
 * Токен выдаёт GET /api/auth/csrf.
 */
export const csrfProtection = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("Origin");
  if (origin && origin !== allowedOrigin) return next(new CsrfException());

  const cookieToken = req.cookies?.[COOKIE_NAMES.csrf];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(new CsrfException());
  }

  next();
};
