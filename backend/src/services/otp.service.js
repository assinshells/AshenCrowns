import { OtpRepository } from "../repositories/otp.repository.js";
import { OtpProvider } from "../providers/otp.provider.js";
import { EmailAdapter } from "../adapters/email.adapter.js";
import { OTP_PURPOSES } from "../constants/auth.constants.js";
import { authConfig } from "../config/auth.config.js";
import logger from "../config/logger.js";
import {
  OtpExpiredException,
  OtpInvalidException,
  OtpTooManyAttemptsException,
  OtpResendCooldownException,
  OtpSendLimitException,
} from "../exceptions/auth.exceptions.js";

const { otp: cfg } = authConfig;

/**
 * OtpService — одноразовые коды подтверждения.
 *
 * Защиты:
 *  - код 6 цифр, генерируется crypto.randomInt;
 *  - в Redis хранится только HMAC(purpose, subject, code), не сам код;
 *  - TTL (OTP_TTL_SECONDS) и лимит неверных попыток (OTP_MAX_ATTEMPTS);
 *  - пауза между отправками (OTP_RESEND_COOLDOWN_SECONDS) и лимит
 *    отправок в час на связку (сценарий, субъект);
 *  - одноразовость: успешная проверка атомарно удаляет запись.
 *
 * `subject` — кому принадлежит операция: нормализованный email (публичные
 * сценарии) или `u{userId}` (операции авторизованного пользователя).
 */
export const OtpService = {
  /**
   * Резервирует «слот» отправки: проверяет паузу и часовой лимит.
   * Вызывается и для несуществующих email (без реальной отправки),
   * чтобы поведение API не выдавало, есть ли такой аккаунт.
   */
  async reserveSend(purpose, subject) {
    const retryAfter = await OtpRepository.acquireCooldown(purpose, subject);
    if (retryAfter > 0) throw new OtpResendCooldownException(retryAfter);

    const sends = await OtpRepository.incrementSends(purpose, subject);
    if (sends > cfg.maxSendsPerHour) {
      await OtpRepository.releaseCooldown(purpose, subject);
      throw new OtpSendLimitException();
    }
  },

  /**
   * Генерирует код, сохраняет его хеш и отправляет письмо на `email`.
   * Слот отправки должен быть уже зарезервирован через reserveSend().
   *
   * @param {boolean} [options.background] — не ждать доставки письма
   *   (публичные сценарии: время ответа не должно выдавать наличие аккаунта).
   */
  async deliver({ purpose, subject, email, payload, background = false }) {
    const code = OtpProvider.generate();
    await OtpRepository.save(purpose, subject, {
      hash: OtpProvider.hash(purpose, subject, code),
      payload,
    });

    const send = EmailAdapter.sendOtp(
      email,
      purpose,
      code,
      Math.round(cfg.ttlSeconds / 60),
    );

    if (background) {
      send.catch((err) =>
        logger.error(`OTP email delivery failed (${purpose}): ${err.message}`),
      );
      return;
    }

    try {
      await send;
    } catch (err) {
      // Письмо не ушло — снимаем паузу, чтобы пользователь мог повторить сразу.
      await OtpRepository.releaseCooldown(purpose, subject);
      throw err;
    }
  },

  /** reserveSend + deliver. */
  async issue(args) {
    await this.reserveSend(args.purpose, args.subject);
    await this.deliver(args);
    return { resendAfterSeconds: cfg.resendCooldownSeconds };
  },

  /** payload ожидающей операции (для повторной отправки кода). */
  async getPendingPayload(purpose, subject) {
    const rec = await OtpRepository.find(purpose, subject);
    if (!rec) throw new OtpExpiredException();
    return rec.payload;
  },

  /**
   * Проверяет код. При успехе запись удаляется (одноразовость), возвращается payload.
   * @throws OtpExpiredException | OtpInvalidException | OtpTooManyAttemptsException
   */
  async verify({ purpose, subject, code }) {
    const rec = await OtpRepository.find(purpose, subject);
    if (!rec) throw new OtpExpiredException();

    const attempts = await OtpRepository.incrementAttempts(purpose, subject);
    if (attempts === -1) throw new OtpExpiredException();
    if (attempts > cfg.maxAttempts) {
      await OtpRepository.consume(purpose, subject);
      throw new OtpTooManyAttemptsException();
    }

    const expected = OtpProvider.hash(purpose, subject, code);
    if (!OtpProvider.safeEqualHex(expected, rec.hash)) {
      if (attempts >= cfg.maxAttempts) {
        await OtpRepository.consume(purpose, subject);
        throw new OtpTooManyAttemptsException();
      }
      throw new OtpInvalidException();
    }

    // Побеждает только один из параллельных запросов с верным кодом.
    const won = await OtpRepository.consume(purpose, subject);
    if (!won) throw new OtpExpiredException();

    return rec.payload;
  },

  /** Сбрасывает ожидающие коды операций авторизованного пользователя (например, при удалении аккаунта). */
  async discardAllForSubject(subject) {
    await Promise.all(
      [OTP_PURPOSES.CHANGE_PASSWORD, OTP_PURPOSES.CHANGE_EMAIL].map((purpose) =>
        OtpRepository.consume(purpose, subject),
      ),
    );
  },

  async createResetToken(userId) {
    const token = OtpProvider.generateOpaqueToken();
    await OtpRepository.saveResetToken(OtpProvider.sha256(token), userId);
    return token;
  },

  /** @returns {Promise<string|null>} userId либо null, если токен недействителен */
  consumeResetToken(token) {
    if (typeof token !== "string" || token.length !== 64) return null;
    return OtpRepository.consumeResetToken(OtpProvider.sha256(token));
  },
};
