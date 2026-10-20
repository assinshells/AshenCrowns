export const ROUTES = Object.freeze({
  home: "/",
  work: "/work",
  stats: "/stats",
  karma: "/karma",
  settingsSecurity: "/settings/security",
  settingsNotifications: "/settings/notifications",
  about: "/about",
  rules: "/rules",
  support: "/support",
  version: "/version",

  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyOtp: "/verify-otp",
});

/** Заголовки страниц игровой зоны (показываются в верхней панели). */
export const ROUTE_TITLES = Object.freeze({
  [ROUTES.home]: "Персонаж",
  [ROUTES.stats]: "Характеристики",
  [ROUTES.karma]: "Силы кармы",
  [ROUTES.work]: "Работа",
  [ROUTES.settingsSecurity]: "Настройки",
  [ROUTES.settingsNotifications]: "Настройки",
  [ROUTES.about]: "Об игре",
  [ROUTES.rules]: "Правила",
  [ROUTES.support]: "Поддержка",
  [ROUTES.version]: "Версия",
});

/** Маршруты, куда безопасно возвращать пользователя после входа. */
export const PROTECTED_PATHS = Object.freeze([
  ROUTES.home,
  ROUTES.stats,
  ROUTES.karma,
  ROUTES.work,
  ROUTES.settingsSecurity,
  ROUTES.settingsNotifications,
  ROUTES.about,
  ROUTES.rules,
  ROUTES.support,
  ROUTES.version,
]);
