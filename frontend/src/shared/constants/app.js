export const APP_NAME = "Ashen Crowns";
export const APP_VERSION = __APP_VERSION__;

// Совпадают с серверной политикой (backend/src/validators/auth.validator.js).
// Клиентская проверка — только удобство; сервер валидирует независимо.
export const LOGIN_RULES = Object.freeze({
  min: 3,
  max: 20,
  pattern: "[A-Za-zА-Яа-яЁёІіЇїЄєҐґ0-9_]+",
  hint: "3–20 символов: латиница, кириллица, цифры и «_». Без пробелов и других символов.",
});

export const PASSWORD_RULES = Object.freeze({
  min: 12,
  max: 64,
  hint: "От 12 до 64 символов, без пробелов: минимум одна строчная и одна заглавная буква и одна цифра.",
});

export const OTP_LENGTH = 6;

// Сценарии OTP: что именно подтверждает код и куда он отправлен.
export const OTP_SCENARIOS = Object.freeze({
  verify_email: {
    title: "Подтверждение email",
    description: "Введите код из письма, чтобы подтвердить адрес и завершить регистрацию.",
    requiresAuth: false,
  },
  reset_password: {
    title: "Восстановление пароля",
    description: "Введите код из письма, чтобы задать новый пароль.",
    requiresAuth: false,
  },
  change_password: {
    title: "Подтверждение смены пароля",
    description: "Введите код из письма, чтобы применить новый пароль. После этого потребуется войти заново.",
    requiresAuth: true,
  },
  change_email: {
    title: "Подтверждение нового email",
    description: "Введите код, отправленный на новый адрес, чтобы подтвердить, что он принадлежит вам.",
    requiresAuth: true,
  },
});
