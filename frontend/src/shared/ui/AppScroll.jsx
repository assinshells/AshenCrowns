import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import SimpleBar from "simplebar-react";

// Кастомный скроллбар — только для устройств с мышью. На сенсорных экранах
// нативный оверлейный скролл лучше работает (и нет проблем с высотой 100vh
// при появлении/скрытии адресной строки мобильного браузера).
const DESKTOP_QUERY = "(hover: hover) and (pointer: fine)";

const useDesktopPointer = () => {
  const [matches, setMatches] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return matches;
};

/**
 * Заменяет нативный скролл страницы на SimpleBar. Высота задаётся классом
 * Bootstrap `vh-100`, нативный скролл body отключается классом `overflow-hidden`.
 * При смене маршрута прокрутка сбрасывается вверх (как и у обычной страницы).
 */
export function AppScroll({ children }) {
  const enabled = useDesktopPointer();
  const scrollRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!enabled) return undefined;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [enabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (!enabled) return children;
  return (
    <SimpleBar className="vh-100" scrollableNodeProps={{ ref: scrollRef }}>
      {children}
    </SimpleBar>
  );
}
