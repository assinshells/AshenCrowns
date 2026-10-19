import nodemailer from "nodemailer";
import logger from "../config/logger.js";
import { env } from "../config/env.js";
import { APP_NAME, OTP_PURPOSES } from "../constants/auth.constants.js";

/**
 * EmailAdapter — отправка писем.
 *
 * EMAIL_TRANSPORT=smtp    — реальная отправка через SMTP (nodemailer).
 * EMAIL_TRANSPORT=console — письма выводятся в лог (ТОЛЬКО development/test;
 *                           в production запуск с console запрещён, см. env.js).
 */

const OTP_SUBJECTS = {
  [OTP_PURPOSES.VERIFY_EMAIL]: "Подтверждение email",
  [OTP_PURPOSES.RESET_PASSWORD]: "Восстановление пароля",
  [OTP_PURPOSES.CHANGE_PASSWORD]: "Подтверждение смены пароля",
  [OTP_PURPOSES.CHANGE_EMAIL]: "Подтверждение нового email",
};

const OTP_INTRO = {
  [OTP_PURPOSES.VERIFY_EMAIL]: `Для завершения регистрации в «${APP_NAME}» введите код:`,
  [OTP_PURPOSES.RESET_PASSWORD]: `Код для восстановления пароля в «${APP_NAME}»:`,
  [OTP_PURPOSES.CHANGE_PASSWORD]: "Код для подтверждения смены пароля:",
  [OTP_PURPOSES.CHANGE_EMAIL]: "Код для подтверждения нового email:",
};

let transporter;
const getTransporter = () => {
  transporter ??= nodemailer.createTransport({
    host: env.email.smtp.host,
    port: env.email.smtp.port,
    secure: env.email.smtp.secure,
    ...(env.email.smtp.user
      ? { auth: { user: env.email.smtp.user, pass: env.email.smtp.pass } }
      : {}),
  });
  return transporter;
};

/** В тестах письма складываются сюда, чтобы тест мог прочитать код. */
const outbox = [];

const deliver = async ({ to, subject, text }) => {
  if (env.email.transport === "smtp") {
    await getTransporter().sendMail({ from: env.email.from, to, subject, text });
    return;
  }

  if (env.nodeEnv === "test") {
    outbox.push({ to, subject, text });
    return;
  }

  // Только dev: тело письма (с кодом) выводится в консоль.
  logger.info(`[DEV EMAIL] to=${to} subject="${subject}"\n${text}`);
};

export const EmailAdapter = {
  outbox,

  async sendOtp(to, purpose, code, ttlMinutes) {
    await deliver({
      to,
      subject: OTP_SUBJECTS[purpose],
      text:
        `${OTP_INTRO[purpose]}\n\n${code}\n\n` +
        `Код действует ${ttlMinutes} мин. и может быть использован один раз.\n` +
        "Если вы не запрашивали код, просто проигнорируйте это письмо.",
    });
  },

  async sendAccountDeleted(to) {
    await deliver({
      to,
      subject: "Аккаунт удалён",
      text:
        `Ваш аккаунт «${APP_NAME}» был удалён по вашему запросу.\n\n` +
        "Если это были не вы, свяжитесь с поддержкой.",
    });
  },

  async sendSecurityNotice(to, message) {
    await deliver({
      to,
      subject: "Событие безопасности аккаунта",
      text:
        `${message}\n\n` +
        "Если это были не вы, немедленно восстановите доступ через «Забыли пароль?».",
    });
  },

  /** Уведомление о событии безопасности без ожидания: сбой доставки только логируется. */
  notifySecurity(to, message) {
    return this.sendSecurityNotice(to, message).catch((err) =>
      logger.error(`Security notice delivery failed: ${err.message}`),
    );
  },
};
