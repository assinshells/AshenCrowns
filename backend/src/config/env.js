/**
 * Centralized, validated access to environment variables.
 * Fails fast at startup if a required variable is missing, instead of
 * letting the app boot into a broken state.
 */

const REQUIRED_VARS = [
  "PORT",
  "CLIENT_URL",
  "DATABASE_URL",
  "REDIS_URL",
  "NODE_ENV",
  "OTP_SECRET",
];

const getEnv = (name, fallback) => process.env[name] ?? fallback;
const getBool = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};

export function assertRequiredEnv() {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Check your .env file against backend/.env.example.",
    );
  }

  if (process.env.OTP_SECRET.length < 32) {
    throw new Error("OTP_SECRET must be at least 32 characters long.");
  }

  const transport = getEnv("EMAIL_TRANSPORT", "console");
  if (!["console", "smtp"].includes(transport)) {
    throw new Error('EMAIL_TRANSPORT must be either "console" or "smtp".');
  }
  if (process.env.NODE_ENV === "production" && transport !== "smtp") {
    // В production OTP-коды не должны попадать в логи.
    throw new Error("EMAIL_TRANSPORT must be 'smtp' in production.");
  }
  if (transport === "smtp") {
    const missingSmtp = ["SMTP_HOST", "SMTP_FROM"].filter(
      (name) => !process.env[name],
    );
    if (missingSmtp.length > 0) {
      throw new Error(
        `EMAIL_TRANSPORT=smtp requires: ${missingSmtp.join(", ")}.`,
      );
    }
  }
}

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  port: Number(getEnv("PORT", 3000)),
  clientUrl: getEnv("CLIENT_URL"),
  databaseUrl: getEnv("DATABASE_URL"),
  redisUrl: getEnv("REDIS_URL"),
  // Количество доверенных reverse-proxy перед приложением (nginx = 1).
  // Нужно, чтобы rate-limit видел реальный IP клиента.
  trustProxy: Number(getEnv("TRUST_PROXY", 0)),

  session: {
    ttlSeconds: Number(getEnv("SESSION_TTL_SECONDS", 604800)),
  },

  // Если true — аккаунт неактивен, пока email не подтверждён OTP-кодом.
  emailVerificationRequired: getBool("EMAIL_VERIFICATION_REQUIRED", true),

  otp: {
    secret: getEnv("OTP_SECRET"),
    ttlSeconds: Number(getEnv("OTP_TTL_SECONDS", 600)),
    length: 6,
    maxAttempts: Number(getEnv("OTP_MAX_ATTEMPTS", 5)),
    resendCooldownSeconds: Number(getEnv("OTP_RESEND_COOLDOWN_SECONDS", 60)),
    maxSendsPerHour: Number(getEnv("OTP_MAX_SENDS_PER_HOUR", 5)),
  },

  loginLock: {
    maxFailures: Number(getEnv("LOGIN_MAX_FAILURES", 5)),
    lockSeconds: Number(getEnv("LOGIN_LOCK_SECONDS", 900)),
  },

  email: {
    transport: getEnv("EMAIL_TRANSPORT", "console"),
    from: getEnv("SMTP_FROM", "Ashen Crowns <no-reply@localhost>"),
    smtp: {
      host: getEnv("SMTP_HOST"),
      port: Number(getEnv("SMTP_PORT", 587)),
      secure: getBool("SMTP_SECURE", false),
      user: getEnv("SMTP_USER"),
      pass: getEnv("SMTP_PASS"),
    },
  },

  rateLimit: {
    windowMs: Number(getEnv("RATE_LIMIT_WINDOW_MS", 900000)),
    loginMax: Number(getEnv("RATE_LIMIT_LOGIN_MAX", 10)),
    registerMax: Number(getEnv("RATE_LIMIT_REGISTER_MAX", 5)),
    forgotMax: Number(getEnv("RATE_LIMIT_FORGOT_MAX", 5)),
    otpMax: Number(getEnv("RATE_LIMIT_OTP_MAX", 10)),
    resendMax: Number(getEnv("RATE_LIMIT_RESEND_MAX", 10)),
    resetMax: Number(getEnv("RATE_LIMIT_RESET_MAX", 5)),
    accountMax: Number(getEnv("RATE_LIMIT_ACCOUNT_MAX", 20)),
  },
};
