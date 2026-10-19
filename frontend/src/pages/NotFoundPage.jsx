import { Link } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";

export function NotFoundPage() {
  return (
    <main className="container py-5 text-center">
      <h1 className="h3">Страница не найдена</h1>
      <p>
        <Link to={ROUTES.home}>На главную</Link>
      </p>
    </main>
  );
}
