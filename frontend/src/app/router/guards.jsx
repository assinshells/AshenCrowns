import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { ROUTES } from "@shared/constants/routes.js";

/**
 * Защищённые маршруты. Решение принимается по состоянию, которое подтверждено
 * сервером (GET /api/auth/me), а не по данным из клиентского хранилища.
 * Исходный адрес передаётся в state — после входа туда можно вернуться
 * (проверяется getSafeRedirect).
 */
export function ProtectedRoute() {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();

  if (status !== "authenticated") {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Публичные страницы входа/регистрации недоступны уже вошедшему пользователю. */
export function PublicOnlyRoute() {
  const status = useSessionStore((s) => s.status);
  if (status === "authenticated") return <Navigate to={ROUTES.home} replace />;
  return <Outlet />;
}
