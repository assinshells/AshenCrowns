import { NavLink } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";

// Основные разделы боковой панели. «Настройки» и «Выход» — в меню пользователя (UserMenu).
const NAV_ITEMS = [
  { to: ROUTES.home, label: "Главная", end: true },
  { to: ROUTES.hero, label: "Персонаж" },
];

/** <li> с пунктами меню (оборачивается в <ul> вызывающим кодом). */
export function NavItems() {
  return NAV_ITEMS.map(({ to, label, end }) => (
    <li className="nav-item" key={to}>
      <NavLink end={end} to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
        {label}
      </NavLink>
    </li>
  ));
}
