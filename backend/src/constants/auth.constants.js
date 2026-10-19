export const AUTH_ERRORS = Object.freeze({
  INVALID_CREDENTIALS: "Неверный email или пароль",
  LOGIN_TAKEN: "Этот логин уже занят",
  EMAIL_TAKEN: "Этот email уже используется",
  EMAIL_NOT_VERIFIED: "Email не подтверждён. Введите код из письма.",
  USER_NOT_FOUND: "Пользователь не найден",
  OTP_EXPIRED: "Срок действия кода истёк или код не найден. Запросите новый код.",
  OTP_INVALID: "Неверный код",
  OTP_TOO_MANY_ATTEMPTS:
    "Слишком много неверных попыток. Запросите новый код.",
  OTP_RESEND_COOLDOWN: "Повторная отправка пока недоступна",
  OTP_SEND_LIMIT: "Достигнут лимит отправки кодов. Попробуйте позже.",
  RESET_TOKEN_INVALID: "Ссылка для сброса пароля недействительна или устарела",
  UNAUTHORIZED: "Требуется авторизация",
  FORBIDDEN: "Доступ запрещён",
  RATE_LIMIT_EXCEEDED: "Слишком много запросов. Попробуйте позже.",
  ACCOUNT_LOCKED:
    "Слишком много неудачных попыток входа. Попробуйте позже.",
  INTERNAL_ERROR: "Внутренняя ошибка сервера",
  VALIDATION_FAILED: "Проверьте введённые данные",
  CSRF_TOKEN_INVALID: "Недействительный CSRF-токен",
  CURRENT_PASSWORD_WRONG: "Текущий пароль указан неверно",
  PASSWORD_SAME_AS_OLD: "Новый пароль должен отличаться от текущего",
  EMAIL_SAME_AS_CURRENT: "Новый email совпадает с текущим",
});

// Cookie sid — httpOnly (идентификатор серверной сессии, недоступен JS).
// Cookie csrf — читаемая JS (double-submit, см. csrf.middleware.js).
export const COOKIE_NAMES = Object.freeze({
  session: "ac_sid",
  csrf: "ac_csrf",
});

// Гендер хранится только в БД (в UI и API не участвует).
export const GENDER_VALUES = Object.freeze({
  MALE: "male",
  FEMALE: "female",
});

// Сценарии применения OTP. Значение попадает в HMAC и ключ Redis,
// поэтому код, выданный для одного сценария, не подходит для другого.
export const OTP_PURPOSES = Object.freeze({
  VERIFY_EMAIL: "verify_email",
  RESET_PASSWORD: "reset_password",
  CHANGE_PASSWORD: "change_password",
  CHANGE_EMAIL: "change_email",
});

export const PUBLIC_OTP_PURPOSES = Object.freeze([
  OTP_PURPOSES.VERIFY_EMAIL,
  OTP_PURPOSES.RESET_PASSWORD,
]);

export const REDIS_KEYS = Object.freeze({
  session: (sidHash) => `sess:${sidHash}`,
  userSessions: (userId) => `user_sess:${userId}`,
  otp: (purpose, subject) => `otp:${purpose}:${subject}`,
  otpCooldown: (purpose, subject) => `otp_cd:${purpose}:${subject}`,
  otpSends: (purpose, subject) => `otp_sends:${purpose}:${subject}`,
  resetToken: (tokenHash) => `reset:${tokenHash}`,
  loginFailures: (email) => `login_fail:${email}`,
  rateLimit: (name) => `rl:${name}:`,
});

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY: 429,
  INTERNAL: 500,
});
