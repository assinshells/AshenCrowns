export const ROUTES = Object.freeze({
  home: "/",
  hero: "/hero",
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

/** Маршруты, куда безопасно возвращать пользователя после входа. */
export const PROTECTED_PATHS = Object.freeze([
  ROUTES.home,
  ROUTES.hero,
  ROUTES.settingsSecurity,
  ROUTES.settingsNotifications,
  ROUTES.about,
  ROUTES.rules,
  ROUTES.support,
  ROUTES.version,
]);
