import crypto from "crypto";

export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

/** Случайный непрозрачный токен: `bytes` случайных байт в hex. */
export const randomHex = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

/** Сравнение строк за постоянное время. */
export const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};
