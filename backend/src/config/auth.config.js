import { env } from "./env.js";

/**
 * authConfig — derived view over `env`. This file must never read
 * process.env directly, so the two configs cannot drift out of sync.
 */
export const authConfig = {
  session: env.session,
  otp: env.otp,
  loginLock: env.loginLock,
  emailVerificationRequired: env.emailVerificationRequired,
  rateLimit: env.rateLimit,
};
