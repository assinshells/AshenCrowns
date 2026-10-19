import { LogoutButton } from "@features/auth/logout/ui/LogoutButton.jsx";
import { NavItems } from "./NavItems.jsx";

/** Боковое меню: Главная, Персонаж, Настройки, Выход. */
export function AppSidebar() {
  return (
    <nav aria-label="Боковое меню">
      <ul className="nav nav-pills flex-column">
        <NavItems />
        <li className="nav-item">
          <LogoutButton className="nav-link w-100 text-start">Выход</LogoutButton>
        </li>
      </ul>
    </nav>
  );
}
