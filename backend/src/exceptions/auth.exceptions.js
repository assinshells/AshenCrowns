import { BaseException } from "./base.exception.js";
import { HTTP_STATUS, AUTH_ERRORS } from "../constants/auth.constants.js";

export class ValidationException extends BaseException {
  constructor(message = AUTH_ERRORS.VALIDATION_FAILED, details = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, "VALIDATION_FAILED");
    this.details = details;
  }
}

export class AuthenticationException extends BaseException {
  constructor(message = AUTH_ERRORS.INVALID_CREDENTIALS) {
    super(message, HTTP_STATUS.UNAUTHORIZED, "AUTHENTICATION_FAILED");
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message = AUTH_ERRORS.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED");
  }
}

export class AuthorizationException extends BaseException {
  constructor(message = AUTH_ERRORS.FORBIDDEN, code = "AUTHORIZATION_FAILED") {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

export class CsrfException extends AuthorizationException {
  constructor() {
    super(AUTH_ERRORS.CSRF_TOKEN_INVALID, "CSRF_TOKEN_INVALID");
  }
}

export class EmailNotVerifiedException extends AuthorizationException {
  constructor(maskedEmail) {
    super(AUTH_ERRORS.EMAIL_NOT_VERIFIED, "EMAIL_NOT_VERIFIED");
    this.extra = { maskedEmail };
  }
}

export class ConflictException extends BaseException {
  constructor(message, code = "CONFLICT") {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

export class RateLimitException extends BaseException {
  constructor(
    message = AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
    code = "RATE_LIMIT_EXCEEDED",
    extra = undefined,
  ) {
    super(message, HTTP_STATUS.TOO_MANY, code, extra);
  }
}

export class AccountLockedException extends RateLimitException {
  constructor(retryAfterSeconds) {
    super(AUTH_ERRORS.ACCOUNT_LOCKED, "ACCOUNT_LOCKED", { retryAfterSeconds });
  }
}

export class OtpResendCooldownException extends RateLimitException {
  constructor(retryAfterSeconds) {
    super(
      `Повторная отправка будет доступна через ${retryAfterSeconds} с`,
      "OTP_RESEND_COOLDOWN",
      { retryAfterSeconds },
    );
  }
}

export class OtpSendLimitException extends RateLimitException {
  constructor() {
    super(AUTH_ERRORS.OTP_SEND_LIMIT, "OTP_SEND_LIMIT");
  }
}

export class OtpExpiredException extends BaseException {
  constructor(message = AUTH_ERRORS.OTP_EXPIRED) {
    super(message, HTTP_STATUS.BAD_REQUEST, "OTP_EXPIRED");
  }
}

export class OtpInvalidException extends BaseException {
  constructor(message = AUTH_ERRORS.OTP_INVALID) {
    super(message, HTTP_STATUS.BAD_REQUEST, "OTP_INVALID");
  }
}

export class OtpTooManyAttemptsException extends BaseException {
  constructor() {
    super(
      AUTH_ERRORS.OTP_TOO_MANY_ATTEMPTS,
      HTTP_STATUS.BAD_REQUEST,
      "OTP_TOO_MANY_ATTEMPTS",
    );
  }
}

// 400, а не 401: клиент не должен принять неверный «текущий пароль»
// за потерю сессии и разлогинить пользователя.
export class InvalidCurrentPasswordException extends BaseException {
  constructor() {
    super(
      AUTH_ERRORS.CURRENT_PASSWORD_WRONG,
      HTTP_STATUS.BAD_REQUEST,
      "CURRENT_PASSWORD_WRONG",
    );
  }
}

// 409: состояние игрока не позволяет операцию. Клиент обновляет профиль и
// показывает сообщение; 401/403 здесь не подходят — сессия валидна.
export class InsufficientSilverException extends ConflictException {
  constructor() {
    super("Недостаточно серебра", "INSUFFICIENT_SILVER");
  }
}

export class AlreadyWorkingException extends ConflictException {
  constructor() {
    super("Вы уже работаете", "ALREADY_WORKING");
  }
}

export class NothingToClaimException extends ConflictException {
  constructor() {
    super("Награды для получения пока нет", "NOTHING_TO_CLAIM");
  }
}

// 404/403 для мира: неизвестный город отличается от закрытого (уровень, событие).
export class CityNotFoundException extends BaseException {
  constructor() {
    super("Город не найден", HTTP_STATUS.NOT_FOUND, "CITY_NOT_FOUND");
  }
}

export class CityLockedException extends AuthorizationException {
  constructor() {
    super("Город пока недоступен", "CITY_LOCKED");
  }
}
