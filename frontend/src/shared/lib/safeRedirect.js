import { PROTECTED_PATHS, ROUTES } from "@shared/constants/routes.js";

/**
 * Возвращает путь для редиректа после входа. Принимает только известные
 * внутренние защищённые маршруты — никаких внешних URL и open redirect.
 */
export const getSafeRedirect = (from) => {
  const pathname = from?.pathname;
  if (typeof pathname !== "string") return ROUTES.home;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return ROUTES.home;
  if (!PROTECTED_PATHS.includes(pathname)) return ROUTES.home;
  return pathname;
};
