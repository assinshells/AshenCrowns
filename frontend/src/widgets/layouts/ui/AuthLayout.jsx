import { APP_NAME } from "@shared/constants/app.js";

/** Макет публичных страниц (вход, регистрация, восстановление, OTP). Только сетка и компоненты Bootstrap. */
export function AuthLayout({ title, description, children }) {
  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5">
          <p className="h3 text-center mb-4">{APP_NAME}</p>
          <div className="card">
            <div className="card-body">
              <h1 className="h5 card-title">{title}</h1>
              {description && <p className="text-body-secondary">{description}</p>}
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
