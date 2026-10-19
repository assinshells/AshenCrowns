import { useNavigate } from "react-router-dom";
import { logoutRequest } from "@features/auth/logout/api/logout.api.js";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ROUTES } from "@shared/constants/routes.js";

/**
 * Выход: серверный endpoint уничтожает сессию и очищает cookie; затем
 * клиентское состояние сбрасывается и выполняется переход на /login.
 * Клиентское состояние сбрасывается и при ошибке сети — доступ к защищённым
 * данным определяется сервером, а не этим флагом.
 */
export function LogoutButton({ className = "btn btn-outline-secondary btn-sm", children = "Выход" }) {
  const navigate = useNavigate();
  const clear = useSessionStore((s) => s.clear);
  const { loading, run } = useRequest();

  const handleClick = async () => {
    await run(logoutRequest);
    clear();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {children}
    </button>
  );
}
