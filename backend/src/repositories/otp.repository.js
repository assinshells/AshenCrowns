import { redisClient } from "../config/redis.js";
import { REDIS_KEYS } from "../constants/auth.constants.js";
import { authConfig } from "../config/auth.config.js";

// Атомарный инкремент счётчика попыток, только если запись существует:
// обычный HINCRBY воссоздал бы истёкший ключ без TTL.
const INCR_ATTEMPTS = `
if redis.call('EXISTS', KEYS[1]) == 0 then return -1 end
return redis.call('HINCRBY', KEYS[1], 'a', 1)
`;

/**
 * OtpRepository — OTP и вспомогательные одноразовые токены в Redis.
 * В Redis лежит только HMAC кода (hash), число попыток и payload операции.
 */
export const OtpRepository = {
  async save(purpose, subject, { hash, payload }) {
    const key = REDIS_KEYS.otp(purpose, subject);
    await redisClient
      .multi()
      .del(key)
      .hSet(key, { h: hash, a: "0", p: JSON.stringify(payload ?? null) })
      .expire(key, authConfig.otp.ttlSeconds)
      .exec();
  },

  /** @returns {Promise<{ hash: string, payload: any } | null>} */
  async find(purpose, subject) {
    const rec = await redisClient.hGetAll(REDIS_KEYS.otp(purpose, subject));
    if (!rec || !rec.h) return null;
    return { hash: rec.h, payload: JSON.parse(rec.p ?? "null") };
  },

  /** @returns {Promise<number>} новое число попыток или -1, если записи нет */
  async incrementAttempts(purpose, subject) {
    return redisClient.eval(INCR_ATTEMPTS, {
      keys: [REDIS_KEYS.otp(purpose, subject)],
    });
  },

  /**
   * Удаляет запись. Возвращает true только тому вызову, который реально
   * удалил ключ — это гарантирует одноразовость при гонке параллельных запросов.
   */
  async consume(purpose, subject) {
    const removed = await redisClient.del(REDIS_KEYS.otp(purpose, subject));
    return removed === 1;
  },

  /** Пауза между отправками. @returns {Promise<number>} 0 — можно слать, иначе секунд до разрешения */
  async acquireCooldown(purpose, subject) {
    const key = REDIS_KEYS.otpCooldown(purpose, subject);
    const ok = await redisClient.set(key, "1", {
      NX: true,
      EX: authConfig.otp.resendCooldownSeconds,
    });
    if (ok) return 0;
    const ttl = await redisClient.ttl(key);
    return ttl > 0 ? ttl : 1;
  },

  async releaseCooldown(purpose, subject) {
    await redisClient.del(REDIS_KEYS.otpCooldown(purpose, subject));
  },

  /** Счётчик отправок за час. @returns {Promise<number>} */
  async incrementSends(purpose, subject) {
    const key = REDIS_KEYS.otpSends(purpose, subject);
    const count = await redisClient.incr(key);
    if (count === 1) await redisClient.expire(key, 3600);
    return count;
  },

  async saveResetToken(tokenHash, userId) {
    await redisClient.set(REDIS_KEYS.resetToken(tokenHash), String(userId), {
      EX: authConfig.otp.ttlSeconds,
    });
  },

  /** Атомарно читает и удаляет токен (GETDEL) — повторно использовать нельзя. */
  async consumeResetToken(tokenHash) {
    return redisClient.getDel(REDIS_KEYS.resetToken(tokenHash));
  },

  async getLoginFailures(email) {
    const key = REDIS_KEYS.loginFailures(email);
    const [count, ttl] = await Promise.all([
      redisClient.get(key),
      redisClient.ttl(key),
    ]);
    return { count: Number(count ?? 0), ttl: ttl > 0 ? ttl : 0 };
  },

  async incrementLoginFailures(email) {
    const key = REDIS_KEYS.loginFailures(email);
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, authConfig.loginLock.lockSeconds);
    }
    return count;
  },

  async clearLoginFailures(email) {
    await redisClient.del(REDIS_KEYS.loginFailures(email));
  },
};
