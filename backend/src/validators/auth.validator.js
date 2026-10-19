import { ValidationException } from "../exceptions/auth.exceptions.js";
import { PUBLIC_OTP_PURPOSES, OTP_PURPOSES } from "../constants/auth.constants.js";

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
  const errors = [...emailErrors(b.email)];
  // При входе политику пароля не раскрываем — только базовые проверки.
  if (!isString(b.password) || !b.password || b.password.length > 256) {
    errors.push("Укажите пароль");
  }
  finish(errors);
};

export const validateForgotPasswordRequest = (raw) =>
  finish(emailErrors(body(raw).email));

export const validateVerifyOtpRequest = (raw) => {
  const b = body(raw);
  const errors = [...emailErrors(b.email), ...codeErrors(b.code)];
  if (!PUBLIC_OTP_PURPOSES.includes(b.purpose)) {
    errors.push("Неизвестный сценарий подтверждения");
  }
  finish(errors);
};

export const validateResendOtpRequest = (raw) => {
  const b = body(raw);
  const errors = [...emailErrors(b.email)];
  if (!PUBLIC_OTP_PURPOSES.includes(b.purpose)) {
    errors.push("Неизвестный сценарий подтверждения");
  }
  finish(errors);
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
  const errors = [...newPasswordErrors(b.newPassword, b.confirmPassword)];
  if (!isString(b.currentPassword) || !b.currentPassword || b.currentPassword.length > 256) {
    errors.push("Укажите текущий пароль");
  }
  finish(errors);
};

export const validateEmailChangeRequest = (raw) => {
  const b = body(raw);
  const errors = [...emailErrors(b.newEmail, "Новый email")];
  if (!isString(b.currentPassword) || !b.currentPassword || b.currentPassword.length > 256) {
    errors.push("Укажите текущий пароль");
  }
  finish(errors);
};

export const validateConfirmCodeRequest = (raw) => finish(codeErrors(body(raw).code));

export const validateAccountResendRequest = (raw) => {
  const purpose = body(raw).purpose;
  if (![OTP_PURPOSES.CHANGE_PASSWORD, OTP_PURPOSES.CHANGE_EMAIL].includes(purpose)) {
    finish(["Неизвестный сценарий подтверждения"]);
  }
};
