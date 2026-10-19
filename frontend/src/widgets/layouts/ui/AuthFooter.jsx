import { APP_NAME, APP_VERSION } from "@shared/constants/app.js";

/** Подвал публичных страниц. Ссылки на разделы игры тут не нужны — они доступны только после входа. */
export function AuthFooter() {
  return (
    <footer className="border-top py-3 mt-auto">
      <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-1 small text-body-secondary text-center">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <span>v{APP_VERSION}</span>
      </div>
    </footer>
  );
}
