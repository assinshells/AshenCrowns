import { Link } from "react-router-dom";
import { APP_NAME } from "@shared/constants/app.js";
import { ROUTES } from "@shared/constants/routes.js";
import { NavItems } from "./NavItems.jsx";
import { UserMenu } from "./UserMenu.jsx";

export const SIDEBAR_ID = "app-sidebar";

/**
 * Боковая панель (без сворачивания): название сайта, меню, внизу — пользователь.
 * ≥ md — закреплена слева; на мобильном выезжает поверх контента (open).
 * onNavigate вызывается при выборе пункта — layout закрывает панель.
 */
export function AppSidebar({ open, onNavigate }) {
  return (
    <aside id={SIDEBAR_ID} className={`app-sidebar${open ? " is-open" : ""}`} aria-label="Боковая панель">
      <Link className="app-sidebar-brand fs-5 fw-semibold text-decoration-none px-3 py-3" to={ROUTES.home} onClick={onNavigate}>
        {APP_NAME}
      </Link>

      <nav className="flex-grow-1 overflow-y-auto px-2" aria-label="Основная навигация" onClick={onNavigate}>
        <ul className="nav nav-pills flex-column">
          <NavItems />
        </ul>
      </nav>

      <UserMenu onNavigate={onNavigate} />
    </aside>
  );
}
