import crypto from "crypto";
import { authConfig } from "../config/auth.config.js";

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

  safeEqualHex(a, b) {
    const bufA = Buffer.from(String(a), "hex");
    const bufB = Buffer.from(String(b), "hex");
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  },

  /** Непрозрачный одноразовый токен (reset-password). */
  generateOpaqueToken() {
    return crypto.randomBytes(32).toString("hex");
  },

  sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
  },
};
