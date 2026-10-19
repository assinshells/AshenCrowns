import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader.jsx";
import { AppSidebar } from "./AppSidebar.jsx";
import { AppFooter } from "./AppFooter.jsx";

/** Общий макет игровых страниц: верхняя панель, боковое меню, контент, футер. */
export function AppLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <AppHeader />
      <div className="container-fluid flex-grow-1">
        <div className="row">
          <aside className="col-md-3 col-lg-2 border-end py-3 d-none d-md-block">
            <AppSidebar />
          </aside>
          <main className="col-12 col-md-9 col-lg-10 py-3 py-md-4 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
