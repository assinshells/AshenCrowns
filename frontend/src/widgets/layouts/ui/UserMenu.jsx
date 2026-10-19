import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronUp, LogOut, Settings } from "lucide-react";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { UserAvatar } from "@entities/session/ui/UserAvatar.jsx";
import { LogoutButton } from "@features/auth/logout/ui/LogoutButton.jsx";
import { ROUTES } from "@shared/constants/routes.js";

/**
 * Футер сайдбара: аватар, имя, уровень. По клику открывается меню вверх
 * (Bootstrap .dropup) с пунктами «Настройки» и «Выход». Закрывается по
 * клику вне меню, Escape и выбору пункта.
 */
export function UserMenu({ onNavigate }) {
  const user = useSessionStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="dropup border-top p-2" ref={rootRef}>
      <button
        type="button"
        className="user-menu-toggle d-flex align-items-center gap-2 w-100 text-start"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar src={user?.avatarPath} size={36} />
        <span className="flex-grow-1 text-truncate">
          <span className="d-block fw-semibold text-truncate">{user?.login}</span>
          <span className="d-block small text-body-secondary">Уровень {user?.stats?.level ?? 1}</span>
        </span>
        <ChevronUp size={16} aria-hidden="true" className={open ? "" : "user-menu-chevron-closed"} />
      </button>

      {open && (
        <ul id={menuId} className="dropdown-menu show w-100 shadow" role="menu">
          <li role="none">
            <Link
              to={ROUTES.settingsSecurity}
              className="dropdown-item d-flex align-items-center gap-2"
              role="menuitem"
              onClick={choose}
            >
              <Settings size={16} aria-hidden="true" />
              Настройки
            </Link>
          </li>
          <li role="none">
            <hr className="dropdown-divider" />
          </li>
          <li role="none">
            <LogoutButton className="dropdown-item d-flex align-items-center gap-2" role="menuitem">
              <LogOut size={16} aria-hidden="true" />
              Выход
            </LogoutButton>
          </li>
        </ul>
      )}
    </div>
  );
}
