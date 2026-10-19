import { NavLink, useLocation } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";

// Единый список основных разделов для верхнего и бокового меню.
// activePrefix — раздел подсвечивается на всех вложенных маршрутах.
const NAV_ITEMS = [
  { to: ROUTES.home, label: "Главная", end: true },
  { to: ROUTES.hero, label: "Персонаж" },
  { to: ROUTES.settingsSecurity, label: "Настройки", activePrefix: "/settings" },
];

/** <li> с пунктами основного меню (оборачивается в <ul> вызывающим кодом). */
export function NavItems() {
  const { pathname } = useLocation();

  return NAV_ITEMS.map(({ to, label, end, activePrefix }) => (
    <li className="nav-item" key={to}>
      <NavLink
        end={end}
        to={to}
        className={({ isActive }) =>
          `nav-link${isActive || (activePrefix && pathname.startsWith(activePrefix)) ? " active" : ""}`
        }
      >
        {label}
      </NavLink>
    </li>
  ));
}
