import { UserRepository } from "../repositories/user.repository.js";
import { SessionService } from "./session.service.js";
import { OtpService } from "./otp.service.js";
import { LoginLock } from "./auth.service.js";
import { PasswordProvider } from "../providers/password.provider.js";
import { EmailAdapter } from "../adapters/email.adapter.js";
import { maskEmail } from "../utils/email.util.js";
import logger from "../config/logger.js";
import {
  ConflictException,
  InvalidCurrentPasswordException,
  OtpExpiredException,
  ValidationException,
} from "../exceptions/auth.exceptions.js";
import { AUTH_ERRORS, OTP_PURPOSES } from "../constants/auth.constants.js";
import { authConfig } from "../config/auth.config.js";

const resendAfterSeconds = authConfig.otp.resendCooldownSeconds;
const subjectOf = (userId) => `u${userId}`;

const notify = (email, message) =>
  EmailAdapter.sendSecurityNotice(email, message).catch((err) =>
    logger.error(`Security notice delivery failed: ${err.message}`),
  );

/**
 * Повторная проверка личности: текущий пароль сверяется на сервере.
 * Неудачные попытки считаются в том же счётчике, что и при входе, поэтому
 * украденную сессию нельзя использовать для подбора пароля.
 */
const assertCurrentPassword = async (user, currentPassword) => {
  const emailKey = user.email.toLowerCase();
  await LoginLock.assertNotLocked(emailKey);

  const ok = await PasswordProvider.verify(currentPassword, user.password_hash);
  if (!ok) {
    await LoginLock.recordFailure(emailKey);
    throw new InvalidCurrentPasswordException();
  }
};

/** user — всегда запись из БД по id из серверной сессии, не из клиентских данных. */
export const AccountService = {
  // ── Смена пароля: запрос → код на текущий email → подтверждение ──────────
  async requestPasswordChange(user, { currentPassword, newPassword }) {
    await assertCurrentPassword(user, currentPassword);

    if (await PasswordProvider.verify(newPassword, user.password_hash)) {
      throw new ValidationException(AUTH_ERRORS.VALIDATION_FAILED, [
        AUTH_ERRORS.PASSWORD_SAME_AS_OLD,
      ]);
    }

    // Новый пароль хешируется сразу; в Redis (на время жизни кода) лежит
    // только хеш. Пароль применяется после подтверждения кодом.
    const passwordHash = await PasswordProvider.hash(newPassword);

    await OtpService.issue({
      purpose: OTP_PURPOSES.CHANGE_PASSWORD,
      subject: subjectOf(user.id),
      email: user.email,
      payload: { passwordHash },
    });

    return { maskedEmail: maskEmail(user.email), resendAfterSeconds };
  },

  async confirmPasswordChange(user, { code }) {
    const payload = await OtpService.verify({
      purpose: OTP_PURPOSES.CHANGE_PASSWORD,
      subject: subjectOf(user.id),
      code,
    });

    await UserRepository.updatePassword(user.id, payload.passwordHash);

    // Все сессии (включая текущую) завершаются: нужен повторный вход.
    await SessionService.destroyAllForUser(user.id);
    await LoginLock.clear(user.email.toLowerCase());

    notify(user.email, "Пароль вашего аккаунта «Ashen Crowns» был изменён.");
  },

  // ── Смена email: запрос → код на НОВЫЙ email → подтверждение ─────────────
  async requestEmailChange(user, { currentPassword, newEmail }) {
    await assertCurrentPassword(user, currentPassword);

    if (newEmail === user.email.toLowerCase()) {
      throw new ValidationException(AUTH_ERRORS.VALIDATION_FAILED, [
        AUTH_ERRORS.EMAIL_SAME_AS_CURRENT,
      ]);
    }
    if (await UserRepository.findByEmail(newEmail)) {
      throw new ConflictException(AUTH_ERRORS.EMAIL_TAKEN, "EMAIL_TAKEN");
    }

    // Основной email не меняется до подтверждения: новый адрес лежит
    // в payload кода, а не в профиле.
    await OtpService.issue({
      purpose: OTP_PURPOSES.CHANGE_EMAIL,
      subject: subjectOf(user.id),
      email: newEmail,
      payload: { newEmail },
    });

    return { maskedEmail: maskEmail(newEmail), resendAfterSeconds };
  },

  async confirmEmailChange(user, { code }) {
    const { newEmail } = await OtpService.verify({
      purpose: OTP_PURPOSES.CHANGE_EMAIL,
      subject: subjectOf(user.id),
      code,
    });

    const updated = await UserRepository.updateEmail(user.id, newEmail);
    if (!updated) {
      throw new ConflictException(AUTH_ERRORS.EMAIL_TAKEN, "EMAIL_TAKEN");
    }

    // Уведомляем прежний адрес о событии безопасности.
    notify(
      user.email,
      `Email вашего аккаунта «Ashen Crowns» был изменён на ${maskEmail(newEmail)}.`,
    );

    return { maskedEmail: maskEmail(newEmail) };
  },

  // ── Повторная отправка кода для ожидающей операции ───────────────────────
  async resendCode(user, { purpose }) {
    const subject = subjectOf(user.id);
    const payload = await OtpService.getPendingPayload(purpose, subject);

    const email =
      purpose === OTP_PURPOSES.CHANGE_EMAIL ? payload?.newEmail : user.email;
    if (!email) throw new OtpExpiredException();

    await OtpService.issue({ purpose, subject, email, payload });
    return { maskedEmail: maskEmail(email), resendAfterSeconds };
  },
};
