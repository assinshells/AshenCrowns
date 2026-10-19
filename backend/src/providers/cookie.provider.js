import { COOKIE_NAMES } from "../constants/auth.constants.js";
import { authConfig } from "../config/auth.config.js";
import { env } from "../config/env.js";
import { randomHex } from "../utils/crypto.util.js";

/**
 * CookieProvider — единственная точка установки/очистки auth-cookies.
 *
 * sid  — httpOnly, недоступна из JS (защита от кражи через XSS).
 * csrf — НЕ httpOnly (сознательно): double-submit-cookie требует, чтобы
 *        клиент прочитал значение и продублировал его в X-CSRF-Token.
 *
 * SameSite=Strict + Secure (в production) для обеих.
 */
const base = {
  secure: env.isProduction,
  sameSite: "strict",
  path: "/",
};

export const CookieProvider = {
  generateCsrfToken() {
    return randomHex();
  },

  setSession(res, sid) {
    res.cookie(COOKIE_NAMES.session, sid, {
      ...base,
      httpOnly: true,
      maxAge: authConfig.session.ttlSeconds * 1000,
    });
  },

  setCsrf(res, token) {
    res.cookie(COOKIE_NAMES.csrf, token, {
      ...base,
      httpOnly: false,
      maxAge: authConfig.session.ttlSeconds * 1000,
    });
  },

  clearSession(res) {
    res.clearCookie(COOKIE_NAMES.session, { ...base, httpOnly: true });
  },

  clearCsrf(res) {
    res.clearCookie(COOKIE_NAMES.csrf, { ...base, httpOnly: false });
  },
};
