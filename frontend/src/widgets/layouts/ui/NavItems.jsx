import { NavLink, useLocation } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";

// Основные разделы боковой панели. «Настройки» и «Выход» — в меню пользователя (UserMenu).
const NAV_ITEMS = [
  {
    to: ROUTES.home,
    label: "Персонаж",
    end: true,
    children: [
      { to: ROUTES.stats, label: "Характеристики" },
      { to: ROUTES.karma, label: "Силы кармы" },
    ],
  },
  { to: ROUTES.work, label: "Работа" },
  {
    to: ROUTES.world,
    label: "Мир",
    children: [
      { to: ROUTES.worldMissions, label: "Миссии" },
      { to: ROUTES.worldMap, label: "Карта мира" },
    ],
  },
];

const linkClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

function NavItem({ to, label, end, children, pathname }) {
  // Подпункты видны только внутри своего раздела: на самом разделе или любом его подпункте.
  const expanded = children && (pathname === to || children.some((c) => pathname === c.to));

  return (
    <li className="nav-item">
      <NavLink end={end} to={to} className={linkClass}>
        {label}
      </NavLink>
      {expanded && (
        <ul className="nav flex-column ms-3">
          {children.map((child) => (
            <li className="nav-item" key={child.to}>
              <NavLink to={child.to} className={linkClass}>
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** <li> с пунктами меню (оборачивается в <ul> вызывающим кодом). Поддерживает один уровень подпунктов. */
export function NavItems() {
  const { pathname } = useLocation();
  return NAV_ITEMS.map((item) => <NavItem key={item.to} pathname={pathname} {...item} />);
}
