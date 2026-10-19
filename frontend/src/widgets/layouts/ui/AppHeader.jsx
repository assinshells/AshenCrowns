import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { APP_NAME } from "@shared/constants/app.js";
import { ROUTES } from "@shared/constants/routes.js";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { UserAvatar } from "@entities/session/ui/UserAvatar.jsx";
import { LogoutButton } from "@features/auth/logout/ui/LogoutButton.jsx";

const navClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

/** Верхняя панель: логотип, основная навигация, аватар, имя, выход. */
export function AppHeader() {
  const user = useSessionStore((s) => s.user);
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav className="navbar navbar-expand-md bg-body-tertiary border-bottom" aria-label="Основная навигация">
        <div className="container-fluid">
          <Link className="navbar-brand" to={ROUTES.home}>
            {APP_NAME}
          </Link>
          <button
            type="button"
            className="navbar-toggler"
            aria-controls="main-nav"
            aria-expanded={open}
            aria-label="Открыть меню"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div id="main-nav" className={`collapse navbar-collapse${open ? " show" : ""}`}>
            <ul className="navbar-nav me-auto" onClick={() => setOpen(false)}>
              <li className="nav-item">
                <NavLink end className={navClass} to={ROUTES.home}>Главная</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navClass} to={ROUTES.hero}>Персонаж</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className={navClass} to={ROUTES.settingsSecurity}>Настройки</NavLink>
              </li>
            </ul>

            <div className="d-flex align-items-center gap-2">
              <UserAvatar src={user?.avatarPath} />
              <span className="navbar-text">{user?.login}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
