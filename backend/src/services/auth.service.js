import { UserRepository } from "../repositories/user.repository.js";
import { OtpRepository } from "../repositories/otp.repository.js";
import { SessionService } from "./session.service.js";
import { OtpService } from "./otp.service.js";
import { PasswordProvider } from "../providers/password.provider.js";
import { EmailAdapter } from "../adapters/email.adapter.js";
import { authConfig } from "../config/auth.config.js";
import { maskEmail } from "../utils/email.util.js";
import {
  AuthenticationException,
  AccountLockedException,
  AuthorizationException,
  ConflictException,
  EmailNotVerifiedException,
  OtpExpiredException,
} from "../exceptions/auth.exceptions.js";
import { AUTH_ERRORS, OTP_PURPOSES } from "../constants/auth.constants.js";

const resendAfterSeconds = authConfig.otp.resendCooldownSeconds;

const conflictError = (field) =>
  field === "email"
    ? new ConflictException(AUTH_ERRORS.EMAIL_TAKEN, "EMAIL_TAKEN")
    : new ConflictException(AUTH_ERRORS.LOGIN_TAKEN, "LOGIN_TAKEN");

/** Общие проверки блокировки перебора пароля (используются и при входе, и при смене пароля/email). */
export const LoginLock = {
  async assertNotLocked(email) {
    const { count, ttl } = await OtpRepository.getLoginFailures(email);
    if (count >= authConfig.loginLock.maxFailures) {
      throw new AccountLockedException(ttl || authConfig.loginLock.lockSeconds);
    }
  },
  recordFailure: (email) => OtpRepository.incrementLoginFailures(email),
  clear: (email) => OtpRepository.clearLoginFailures(email),
};

export const AuthService = {
  async register({ login, email, password }) {
    // Предварительные проверки дают понятные сообщения; окончательно
    // уникальность гарантируют UNIQUE-индексы (гонки параллельных регистраций).
    if (await UserRepository.findByLogin(login)) throw conflictError("login");
    if (await UserRepository.findByEmail(email)) throw conflictError("email");

    const passwordHash = await PasswordProvider.hash(password);
    const requiresVerification = authConfig.emailVerificationRequired;

    const { user, conflict } = await UserRepository.create({
      login,
      email,
      passwordHash,
      emailVerified: !requiresVerification,
    });
    if (!user) throw conflictError(conflict);

    // Сессия НЕ создаётся: вход возможен только через /login
    // (и только после подтверждения email, если оно включено).
    if (requiresVerification) {
      await OtpService.issue({
        purpose: OTP_PURPOSES.VERIFY_EMAIL,
        subject: email,
        email,
        payload: null,
        background: true,
      });
    }

    return {
      requiresEmailVerification: requiresVerification,
      maskedEmail: maskEmail(email),
      resendAfterSeconds: requiresVerification ? resendAfterSeconds : 0,
    };
  },

  async login({ email, password }, meta) {
    await LoginLock.assertNotLocked(email);

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Выравниваем время ответа с «пользователь найден».
      await PasswordProvider.dummyVerify(password);
      await LoginLock.recordFailure(email);
      throw new AuthenticationException();
    }

    const valid = await PasswordProvider.verify(password, user.password_hash);
    if (!valid) {
      await LoginLock.recordFailure(email);
      throw new AuthenticationException();
    }

    // Пароль верный — счётчик ошибок сбрасываем, но сессию не выдаём,
    // пока не пройдены обязательные проверки аккаунта.
    await LoginLock.clear(email);

    if (authConfig.emailVerificationRequired && !user.email_verified_at) {
      throw new EmailNotVerifiedException(maskEmail(user.email));
    }

    const sid = await SessionService.create(user.id, meta);
    return { sid, user };
  },

  async logout({ sid }) {
    await SessionService.destroy(sid);
  },

  /**
   * Запрос кода для восстановления пароля. Ответ одинаков для существующих
   * и несуществующих email (нет перечисления пользователей); пауза между
   * запросами действует в обоих случаях.
   */
  async forgotPassword({ email }) {
    const purpose = OTP_PURPOSES.RESET_PASSWORD;
    await OtpService.reserveSend(purpose, email);

    const user = await UserRepository.findByEmail(email);
    if (user) {
      await OtpService.deliver({
        purpose,
        subject: email,
        email,
        payload: null,
        background: true,
      });
    }
    return { maskedEmail: maskEmail(email), resendAfterSeconds };
  },

  /** Повторная отправка кода для публичных сценариев. */
  async resendOtp({ email, purpose }) {
    await OtpService.reserveSend(purpose, email);

    const user = await UserRepository.findByEmail(email);
    const eligible =
      user &&
      (purpose === OTP_PURPOSES.RESET_PASSWORD || !user.email_verified_at);

    if (eligible) {
      await OtpService.deliver({
        purpose,
        subject: email,
        email,
        payload: null,
        background: true,
      });
    }
    return { maskedEmail: maskEmail(email), resendAfterSeconds };
  },

  async verifyOtp({ email, code, purpose }) {
    await OtpService.verify({ purpose, subject: email, code });

    // Если код был верным, запись о нём существовала, значит аккаунт есть;
    // проверка ниже — на случай удаления аккаунта между запросами.
    const user = await UserRepository.findByEmail(email);
    if (!user) throw new OtpExpiredException();

    if (purpose === OTP_PURPOSES.VERIFY_EMAIL) {
      await UserRepository.markEmailVerified(user.id);
      return { verified: true };
    }

    const resetToken = await OtpService.createResetToken(user.id);
    return { resetToken };
  },

  async resetPassword({ resetToken, password }) {
    const userId = await OtpService.consumeResetToken(resetToken);
    if (!userId) {
      throw new AuthorizationException(
        AUTH_ERRORS.RESET_TOKEN_INVALID,
        "RESET_TOKEN_INVALID",
      );
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AuthorizationException(
        AUTH_ERRORS.RESET_TOKEN_INVALID,
        "RESET_TOKEN_INVALID",
      );
    }

    const passwordHash = await PasswordProvider.hash(password);
    await UserRepository.updatePassword(user.id, passwordHash);

    // Смена пароля отзывает ВСЕ активные сессии и снимает блокировку входа.
    await SessionService.destroyAllForUser(user.id);
    await LoginLock.clear(user.email.toLowerCase());

    EmailAdapter.sendSecurityNotice(
      user.email,
      "Пароль вашего аккаунта «Ashen Crowns» был изменён.",
    ).catch(() => {});
  },
};
