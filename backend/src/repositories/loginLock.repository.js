import { redisClient } from "../config/redis.js";
import { REDIS_KEYS } from "../constants/auth.constants.js";
import { authConfig } from "../config/auth.config.js";

/** LoginLockRepository — счётчик неудачных попыток ввода пароля (по email) в Redis. */
export const LoginLockRepository = {
  async getFailures(email) {
    const key = REDIS_KEYS.loginFailures(email);
    const [count, ttl] = await Promise.all([
      redisClient.get(key),
      redisClient.ttl(key),
    ]);
    return { count: Number(count ?? 0), ttl: ttl > 0 ? ttl : 0 };
  },

  async incrementFailures(email) {
    const key = REDIS_KEYS.loginFailures(email);
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, authConfig.loginLock.lockSeconds);
    }
    return count;
  },

  async clearFailures(email) {
    await redisClient.del(REDIS_KEYS.loginFailures(email));
  },
};
