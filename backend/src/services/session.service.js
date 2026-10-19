import crypto from "crypto";
import { SessionRepository } from "../repositories/session.repository.js";
import { authConfig } from "../config/auth.config.js";

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

// Абсолютный предел жизни сессии, независимо от скользящего продления.
const ABSOLUTE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SessionService — серверные сессии.
 * Клиент получает только случайный непрозрачный sid (в httpOnly cookie);
 * все данные сессии живут в Redis и могут быть отозваны в любой момент.
 */
export const SessionService = {
  /** Каждый логин создаёт НОВЫЙ sid — защита от session fixation. */
  async create(userId, { ip, userAgent } = {}) {
    const sid = crypto.randomBytes(32).toString("base64url");
    await SessionRepository.pruneIndex(userId);
    await SessionRepository.save(
      sha256(sid),
      { userId, createdAt: Date.now(), ip: ip ?? null, ua: userAgent ?? null },
      authConfig.session.ttlSeconds,
    );
    return sid;
  },

  /** @returns {Promise<{ userId: number } | null>} */
  async resolve(sid) {
    if (typeof sid !== "string" || sid.length < 20 || sid.length > 100) {
      return null;
    }
    const sidHash = sha256(sid);
    const session = await SessionRepository.find(sidHash);
    if (!session) return null;

    if (Date.now() - session.createdAt > ABSOLUTE_LIFETIME_MS) {
      await SessionRepository.delete(sidHash, session.userId);
      return null;
    }

    await SessionRepository.touch(
      sidHash,
      session.userId,
      authConfig.session.ttlSeconds,
    );
    return { userId: session.userId };
  },

  async destroy(sid) {
    if (typeof sid !== "string" || !sid) return;
    const sidHash = sha256(sid);
    const session = await SessionRepository.find(sidHash);
    await SessionRepository.delete(sidHash, session?.userId);
  },

  destroyAllForUser(userId) {
    return SessionRepository.deleteAllForUser(userId);
  },
};
