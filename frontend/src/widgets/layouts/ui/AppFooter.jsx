import { Link } from "react-router-dom";
import { APP_NAME, APP_VERSION } from "@shared/constants/app.js";
import { ROUTES } from "@shared/constants/routes.js";

/** Ссылки-заглушки; реальные контакты не размещаются. */
export function AppFooter() {
  return (
    <footer className="border-top py-3 mt-auto">
      <div className="container-fluid d-flex flex-wrap gap-3 small">
        <Link to={ROUTES.about}>Об игре</Link>
        <Link to={ROUTES.rules}>Правила</Link>
        <Link to={ROUTES.support}>Поддержка</Link>
        <Link to={ROUTES.version}>Версия</Link>
        <span className="text-body-secondary ms-md-auto">
          {APP_NAME} v{APP_VERSION}
        </span>
      </div>
    </footer>
  );
}
