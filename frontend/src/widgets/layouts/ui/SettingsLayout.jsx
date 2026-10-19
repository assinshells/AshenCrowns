import { NavLink, Outlet } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";

const tabClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

/** Подразделы настроек: Безопасность, Уведомления. */
export function SettingsLayout() {
  return (
    <>
      <h1 className="h3 mb-3">Настройки</h1>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <NavLink className={tabClass} to={ROUTES.settingsSecurity}>Безопасность</NavLink>
        </li>
        <li className="nav-item">
          <NavLink className={tabClass} to={ROUTES.settingsNotifications}>Уведомления</NavLink>
        </li>
      </ul>
      <Outlet />
    </>
  );
}
