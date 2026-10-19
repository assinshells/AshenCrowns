import { useLocation } from "react-router-dom";
import { APP_NAME } from "@shared/constants/app.js";
import { ROUTE_TITLES } from "@shared/constants/routes.js";
import { GameStats } from "./GameStats.jsx";

/** Тонкая панель над контентом: название страницы и параметры игрока. Видна на всех страницах. */
export function TopBar() {
  const { pathname } = useLocation();

  return (
    <header className="app-topbar sticky-top bg-body border-bottom px-3 py-2 d-flex flex-wrap align-items-center column-gap-4 row-gap-1">
      <h1 className="h6 mb-0 me-auto text-truncate">{ROUTE_TITLES[pathname] ?? APP_NAME}</h1>
      <GameStats />
    </header>
  );
}
