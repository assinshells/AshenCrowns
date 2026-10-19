import crypto from "crypto";
import { authConfig } from "../config/auth.config.js";
import { randomHex, safeEqual, sha256 } from "../utils/crypto.util.js";

export const OtpProvider = {
  /** Шестизначный числовой код, криптографически стойкий генератор. */
  generate() {
    const { length } = authConfig.otp;
    return String(crypto.randomInt(0, 10 ** length)).padStart(length, "0");
  },

  /**
   * HMAC-SHA256 с серверным секретом. Привязан к сценарию и субъекту,
   * поэтому код нельзя использовать в другом сценарии/для другого email.
   * В Redis хранится только этот хеш, а не сам код.
   */
  hash(purpose, subject, code) {
    return crypto
      .createHmac("sha256", authConfig.otp.secret)
      .update(`${purpose}\n${subject}\n${code}`)
      .digest("hex");
  },

  safeEqualHex: safeEqual,

  /** Непрозрачный одноразовый токен (reset-password). */
  generateOpaqueToken() {
    return randomHex();
  },

  sha256,
};
