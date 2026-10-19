import { NavLink, useMatch } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";
import { LogoutButton } from "@features/auth/logout/ui/LogoutButton.jsx";

const navClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

/** Боковое меню: Главная, Персонаж, Настройки, Выход. */
export function AppSidebar() {
  const inSettings = Boolean(useMatch("/settings/*"));

  return (
    <nav aria-label="Боковое меню">
      <ul className="nav nav-pills flex-column">
        <li className="nav-item">
          <NavLink end className={navClass} to={ROUTES.home}>Главная</NavLink>
        </li>
        <li className="nav-item">
          <NavLink className={navClass} to={ROUTES.hero}>Персонаж</NavLink>
        </li>
        <li className="nav-item">
          <NavLink
            className={() => `nav-link${inSettings ? " active" : ""}`}
            to={ROUTES.settingsSecurity}
          >
            Настройки
          </NavLink>
        </li>
        <li className="nav-item">
          <LogoutButton className="nav-link w-100 text-start">Выход</LogoutButton>
        </li>
      </ul>
    </nav>
  );
}
