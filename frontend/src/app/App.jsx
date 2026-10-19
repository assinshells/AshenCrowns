import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "@app/router/AppRouter.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { setUnauthorizedHandler } from "@shared/api/http.js";
import { Spinner } from "@shared/ui/Spinner.jsx";

export default function App() {
  const status = useSessionStore((s) => s.status);

  useEffect(() => {
    // Любой 401 на защищённом запросе = сессия недействительна → защищённые маршруты закроются.
    setUnauthorizedHandler(() => useSessionStore.getState().clear());
    useSessionStore.getState().load();
  }, []);

  // Пока сервер не подтвердил состояние сессии, никакие данные не показываются.
  if (status === "loading") return <Spinner />;

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
