import { redisClient } from "../config/redis.js";
import { REDIS_KEYS } from "../constants/auth.constants.js";

/**
 * SessionRepository — серверные сессии в Redis.
 *
 *   sess:{sha256(sid)}  -> JSON { userId, createdAt, ip, ua }   (TTL)
 *   user_sess:{userId}  -> SET of sha256(sid)                    (индекс для «завершить все»)
 *
 * Ключом служит хеш sid: утечка дампа Redis не даёт готовых идентификаторов сессий.
 */
export const SessionRepository = {
  async save(sidHash, data, ttlSeconds) {
    await redisClient
      .multi()
      .set(REDIS_KEYS.session(sidHash), JSON.stringify(data), { EX: ttlSeconds })
      .sAdd(REDIS_KEYS.userSessions(data.userId), sidHash)
      .expire(REDIS_KEYS.userSessions(data.userId), ttlSeconds)
      .exec();
  },

  async find(sidHash) {
    const raw = await redisClient.get(REDIS_KEYS.session(sidHash));
    return raw ? JSON.parse(raw) : null;
  },

  async touch(sidHash, userId, ttlSeconds) {
    await redisClient
      .multi()
      .expire(REDIS_KEYS.session(sidHash), ttlSeconds)
      .expire(REDIS_KEYS.userSessions(userId), ttlSeconds)
      .exec();
  },

  async delete(sidHash, userId) {
    const multi = redisClient.multi().del(REDIS_KEYS.session(sidHash));
    if (userId !== undefined) {
      multi.sRem(REDIS_KEYS.userSessions(userId), sidHash);
    }
    await multi.exec();
  },

  /** Удаляет все сессии пользователя. @returns {Promise<number>} число завершённых */
  async deleteAllForUser(userId) {
    const indexKey = REDIS_KEYS.userSessions(userId);
    const hashes = await redisClient.sMembers(indexKey);
    const multi = redisClient.multi();
    for (const h of hashes) multi.del(REDIS_KEYS.session(h));
    multi.del(indexKey);
    await multi.exec();
    return hashes.length;
  },

  /** Убирает из индекса записи о уже истёкших сессиях. */
  async pruneIndex(userId) {
    const indexKey = REDIS_KEYS.userSessions(userId);
    const hashes = await redisClient.sMembers(indexKey);
    for (const h of hashes) {
      const exists = await redisClient.exists(REDIS_KEYS.session(h));
      if (!exists) await redisClient.sRem(indexKey, h);
    }
  },
};
