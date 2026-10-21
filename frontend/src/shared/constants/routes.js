export const ROUTES = Object.freeze({
  home: "/",
  hero: "/hero",
  work: "/work",
  // Доступна только как переход со страницы «Работа» (по прямой ссылке — редирект), в PROTECTED_PATHS не входит.
  workProgress: "/work/progress",
  stats: "/stats",
  karma: "/karma",
  // «Мир» — раздел-родитель: по прямой ссылке перенаправляет на подпункт «Миссии».
  world: "/world",
  worldMissions: "/world/missions",
  worldMap: "/world/map",
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
  [ROUTES.hero]: "Герой",
  [ROUTES.stats]: "Характеристики",
  [ROUTES.karma]: "Силы кармы",
  [ROUTES.work]: "Работа",
  [ROUTES.workProgress]: "Время работы",
  [ROUTES.world]: "Мир",
  [ROUTES.worldMissions]: "Миссии",
  [ROUTES.worldMap]: "Карта мира",
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
  ROUTES.hero,
  ROUTES.stats,
  ROUTES.karma,
  ROUTES.work,
  ROUTES.world,
  ROUTES.worldMissions,
  ROUTES.worldMap,
  ROUTES.settingsSecurity,
  ROUTES.settingsNotifications,
  ROUTES.about,
  ROUTES.rules,
  ROUTES.support,
  ROUTES.version,
]);
