import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar, SIDEBAR_ID } from "./AppSidebar.jsx";
import { AppFooter } from "./AppFooter.jsx";

/**
 * Макет игровых страниц: сайдбар слева, справа контент и футер.
 * На мобильном сайдбар скрыт и открывается плавающей кнопкой.
 */
export function AppLayout() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="d-flex min-vh-100">
      <AppSidebar open={open} onNavigate={close} />

      {open && <div className="offcanvas-backdrop fade show d-md-none" onClick={close} />}

      {!open && (
        <button
          type="button"
          className="btn btn-primary rounded-circle shadow position-fixed bottom-0 start-0 m-3 d-md-none app-fab"
          aria-label="Открыть меню"
          aria-controls={SIDEBAR_ID}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu size={24} aria-hidden="true" />
        </button>
      )}

      <div className="app-content flex-grow-1 d-flex flex-column">
        <main className="flex-grow-1 container-fluid py-3 py-md-4 overflow-x-hidden">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
