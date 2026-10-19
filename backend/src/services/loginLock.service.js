import { LoginLockRepository } from "../repositories/loginLock.repository.js";
import { AccountLockedException } from "../exceptions/auth.exceptions.js";
import { authConfig } from "../config/auth.config.js";
import { normalizeEmail } from "../utils/email.util.js";

/**
 * Блокировка перебора пароля. Общая для входа и для операций, требующих
 * повторного ввода текущего пароля (смена пароля/email, удаление аккаунта).
 * Ключ — нормализованный email.
 */
export const LoginLock = {
  async assertNotLocked(email) {
    const { count, ttl } = await LoginLockRepository.getFailures(normalizeEmail(email));
    if (count >= authConfig.loginLock.maxFailures) {
      throw new AccountLockedException(ttl || authConfig.loginLock.lockSeconds);
    }
  },
  recordFailure: (email) => LoginLockRepository.incrementFailures(normalizeEmail(email)),
  clear: (email) => LoginLockRepository.clearFailures(normalizeEmail(email)),
};
