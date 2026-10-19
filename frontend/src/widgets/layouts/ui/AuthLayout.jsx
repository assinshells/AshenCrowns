import { APP_NAME } from "@shared/constants/app.js";
import { AuthFooter } from "./AuthFooter.jsx";

/** Макет публичных страниц (вход, регистрация, восстановление, OTP): карточка по центру + футер. Только сетка и компоненты Bootstrap. */
export function AuthLayout({ title, description, children }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <main className="container py-4 py-md-5 flex-grow-1">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 col-xxl-4">
            <p className="h3 text-center mb-4">{APP_NAME}</p>
            <div className="card">
              <div className="card-body p-3 p-sm-4">
                <h1 className="h5 card-title">{title}</h1>
                {description && <p className="text-body-secondary">{description}</p>}
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
      <AuthFooter />
    </div>
  );
}
