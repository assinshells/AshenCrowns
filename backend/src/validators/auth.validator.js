import { ValidationException } from "../exceptions/auth.exceptions.js";
import { PUBLIC_OTP_PURPOSES, OTP_PURPOSES } from "../constants/auth.constants.js";
import { ATTRIBUTE_KEYS } from "../constants/character.constants.js";
import { WORK_KINDS, WORK_MIN_HOURS, WORK_MAX_HOURS } from "../constants/work.constants.js";

/**
 * Серверная валидация. Все функции принимают «сырое» тело запроса,
 * ничего не доверяя клиенту: типы проверяются явно (защита от объектов
 * вместо строк), правила не зависят от клиентской валидации.
 */

// ── Логин ────────────────────────────────────────────────────────────────
// До 20 символов: латиница/кириллица, цифры и «_» (в начале, середине и
// конце). Пробелы и любые другие символы запрещены.
export const LOGIN_MIN = 3;
export const LOGIN_MAX = 20;
export const LOGIN_REGEX = /^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ0-9_]+$/;

// ── Пароль ───────────────────────────────────────────────────────────────
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 64; // верхняя граница защищает KDF от DoS длинными строками

const isString = (v) => typeof v === "string";
const length = (v) => [...v].length;

export const isValidEmail = (value) =>
  isString(value) &&
  value.length <= 254 &&
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(
    value.trim(),
  );

export const loginErrors = (value) => {
  if (!isString(value)) return ["Укажите логин"];
  const len = length(value);
  const errors = [];
  if (len < LOGIN_MIN || len > LOGIN_MAX) {
    errors.push(`Логин: от ${LOGIN_MIN} до ${LOGIN_MAX} символов`);
  }
  if (!LOGIN_REGEX.test(value)) {
    errors.push(
      "Логин: допустимы только латиница, кириллица, цифры и «_» (без пробелов и других символов)",
    );
  }
  return errors;
};

export const passwordErrors = (value) => {
  if (!isString(value)) return ["Укажите пароль"];
  const errors = [];
  const len = length(value);
  if (len < PASSWORD_MIN) {
    errors.push(`Пароль: минимум ${PASSWORD_MIN} символов`);
  }
  if (len > PASSWORD_MAX) {
    errors.push(`Пароль: максимум ${PASSWORD_MAX} символов`);
  }
  if (/\s/u.test(value)) errors.push("Пароль не должен содержать пробелов");
  if (/\p{Cc}/u.test(value)) {
    errors.push("Пароль содержит недопустимые символы");
  }
  if (!/\p{Ll}/u.test(value)) {
    errors.push("Пароль: нужна хотя бы одна строчная буква");
  }
  if (!/\p{Lu}/u.test(value)) {
    errors.push("Пароль: нужна хотя бы одна заглавная буква");
  }
  if (!/\p{Nd}/u.test(value)) {
    errors.push("Пароль: нужна хотя бы одна цифра");
  }
  return errors;
};

const finish = (errors) => {
  if (errors.length) throw new ValidationException(undefined, errors);
};

const body = (b) => (b && typeof b === "object" ? b : {});

const newPasswordErrors = (password, confirmPassword) => {
  const errors = passwordErrors(password);
  if (password !== confirmPassword) errors.push("Пароли не совпадают");
  return errors;
};

const MAX_LOGIN_PASSWORD_LENGTH = 256;
const CURRENT_PASSWORD_MESSAGE = "Укажите текущий пароль";

// Пароль, введённый для проверки (вход, подтверждение личности): политику не раскрываем.
const enteredPasswordErrors = (value, message = "Укажите пароль") =>
  isString(value) && value && value.length <= MAX_LOGIN_PASSWORD_LENGTH ? [] : [message];

const purposeErrors = (purpose, allowed) =>
  allowed.includes(purpose) ? [] : ["Неизвестный сценарий подтверждения"];

const codeErrors = (code) =>
  isString(code) && /^\d{6}$/.test(code) ? [] : ["Код состоит из 6 цифр"];

const emailErrors = (email, label = "Email") =>
  isValidEmail(email) ? [] : [`${label}: укажите корректный адрес`];

export const validateRegisterRequest = (raw) => {
  const b = body(raw);
  finish([
    ...loginErrors(b.login),
    ...emailErrors(b.email),
    ...newPasswordErrors(b.password, b.confirmPassword),
  ]);
};

export const validateLoginRequest = (raw) => {
  const b = body(raw);
  // При входе политику пароля не раскрываем — только базовые проверки.
  finish([...emailErrors(b.email), ...enteredPasswordErrors(b.password)]);
};

export const validateForgotPasswordRequest = (raw) =>
  finish(emailErrors(body(raw).email));

export const validateVerifyOtpRequest = (raw) => {
  const b = body(raw);
  finish([
    ...emailErrors(b.email),
    ...codeErrors(b.code),
    ...purposeErrors(b.purpose, PUBLIC_OTP_PURPOSES),
  ]);
};

export const validateResendOtpRequest = (raw) => {
  const b = body(raw);
  finish([...emailErrors(b.email), ...purposeErrors(b.purpose, PUBLIC_OTP_PURPOSES)]);
};

export const validateResetPasswordRequest = (raw) => {
  const b = body(raw);
  const errors = newPasswordErrors(b.password, b.confirmPassword);
  if (!isString(b.resetToken) || !b.resetToken) {
    errors.push("Отсутствует токен восстановления");
  }
  finish(errors);
};

// ── Операции авторизованного пользователя ─────────────────────────────────
export const validatePasswordChangeRequest = (raw) => {
  const b = body(raw);
  finish([
    ...newPasswordErrors(b.newPassword, b.confirmPassword),
    ...enteredPasswordErrors(b.currentPassword, CURRENT_PASSWORD_MESSAGE),
  ]);
};

export const validateEmailChangeRequest = (raw) => {
  const b = body(raw);
  finish([
    ...emailErrors(b.newEmail, "Новый email"),
    ...enteredPasswordErrors(b.currentPassword, CURRENT_PASSWORD_MESSAGE),
  ]);
};

export const validateConfirmCodeRequest = (raw) => finish(codeErrors(body(raw).code));

export const validateAccountResendRequest = (raw) => {
  finish(
    purposeErrors(body(raw).purpose, [OTP_PURPOSES.CHANGE_PASSWORD, OTP_PURPOSES.CHANGE_EMAIL]),
  );
};

export const validateAccountDeleteRequest = (raw) => {
  finish(enteredPasswordErrors(body(raw).currentPassword, CURRENT_PASSWORD_MESSAGE));
};

export const validateUpgradeAttributeRequest = (raw) => {
  const { attribute } = body(raw);
  finish(
    isString(attribute) && ATTRIBUTE_KEYS.includes(attribute)
      ? []
      : ["Неизвестная характеристика"],
  );
};

export const validateStartWorkRequest = (raw) => {
  const { kind, hours } = body(raw);
  const errors = [];
  if (!isString(kind) || !WORK_KINDS.includes(kind)) errors.push("Неизвестный вид работы");
  if (!Number.isInteger(hours) || hours < WORK_MIN_HOURS || hours > WORK_MAX_HOURS) {
    errors.push(`Время работы — от ${WORK_MIN_HOURS} до ${WORK_MAX_HOURS} часов`);
  }
  finish(errors);
};
