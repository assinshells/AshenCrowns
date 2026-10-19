import { normalizeEmail } from "../utils/email.util.js";

/**
 * DTO — нормализация входящих данных ПОСЛЕ валидации.
 * Валидаторы гарантируют типы, поэтому здесь безопасно вызывать строковые методы.
 */

export const toRegisterDto = (b) => ({
  login: b.login.trim(),
  email: normalizeEmail(b.email),
  password: b.password,
});

export const toLoginDto = (b) => ({
  email: normalizeEmail(b.email),
  password: b.password,
});

export const toForgotPasswordDto = (b) => ({ email: normalizeEmail(b.email) });

export const toVerifyOtpDto = (b) => ({
  email: normalizeEmail(b.email),
  code: b.code,
  purpose: b.purpose,
});

export const toResendOtpDto = (b) => ({
  email: normalizeEmail(b.email),
  purpose: b.purpose,
});

export const toResetPasswordDto = (b) => ({
  resetToken: b.resetToken,
  password: b.password,
});

export const toPasswordChangeDto = (b) => ({
  currentPassword: b.currentPassword,
  newPassword: b.newPassword,
});

export const toEmailChangeDto = (b) => ({
  currentPassword: b.currentPassword,
  newEmail: normalizeEmail(b.newEmail),
});

/** Игровые параметры игрока (значения хранятся в БД; стартовые — DEFAULT колонок). */
export const toPlayerStats = (user) => ({
  level: user.level,
  health: user.health,
  maxHealth: user.max_health,
  experience: user.experience,
  experienceToNext: user.experience_to_next,
  silver: user.silver,
  rubies: user.rubies,
});

/** Публичное представление пользователя: без хеша и без полного email. */
export const toPublicUser = (user, maskEmail) => ({
  id: user.id,
  login: user.login,
  maskedEmail: maskEmail(user.email),
  avatarPath: user.avatar_path,
  stats: toPlayerStats(user),
});
