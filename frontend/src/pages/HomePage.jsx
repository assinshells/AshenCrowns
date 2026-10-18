import { LogoutButton } from "@features/auth/logout/ui/LogoutButton.jsx";

/**
 * HomePage — заглушка защищённой страницы, куда пользователь попадает
 * после успешного логина. В исходном проекте это был ChatPage (чат),
 * но чат — не часть модуля аутентификации, поэтому здесь оставлена
 * только демонстрация того, где и как используется кнопка "Log out".
 */
export function HomePage({ login, onLogout }) {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 text-center">
          <h2 className="mb-3">Вы вошли как {login}</h2>
          <p className="text-muted mb-4">
            Это защищённая страница. Доступ к ней возможен только с валидной
            сессией.
          </p>
          <LogoutButton onLoggedOut={onLogout} />
        </div>
      </div>
    </div>
  );
}
