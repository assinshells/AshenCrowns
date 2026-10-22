/**
 * Подписи мира. Сами города, локации, уровни и даты событий приходят с сервера (таблицы cities,
 * locations, world_events) — здесь только тексты интерфейса. Числовые коэффициенты риска клиенту не отдаются.
 */
export const RISK_LABEL = "Риск";

/** Ключ risk с сервера → подпись и цвет значка Bootstrap. */
export const RISK_LEVELS = Object.freeze({
  none: { label: "Без риска", badge: "text-bg-secondary" },
  low: { label: "Низкий", badge: "text-bg-success" },
  moderate: { label: "Умеренный", badge: "text-bg-info" },
  high: { label: "Высокий", badge: "text-bg-warning" },
  very_high: { label: "Очень высокий", badge: "text-bg-danger" },
  critical: { label: "Критический", badge: "text-bg-dark" },
});

export const riskLevel = (key) => RISK_LEVELS[key] ?? RISK_LEVELS.none;

/** «С 5 уровня» — подпись требуемого уровня. */
export const levelLabel = (level) => `С ${level} уровня`;

/** Дата события в часовом поясе события, например «24 апреля 2027 г., 10:00 UTC». */
export function formatEventDate(iso, timezone = "UTC") {
  const date = new Date(iso);
  const options = {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat("ru-RU", { ...options, timeZone: "UTC" }).format(date);
  }
}

/** Строка о состоянии города события; для постоянных городов — null. */
export function eventText(event) {
  if (!event) return null;
  switch (event.state) {
    case "open":
      return `Событие идёт до ${formatEventDate(event.endsAt, event.timezone)}`;
    case "upcoming":
      return `Событие начнётся ${formatEventDate(event.startsAt, event.timezone)}`;
    case "closed":
      return "Событие завершено, город откроется в следующий раз";
    default:
      return "Даты события пока не объявлены";
  }
}
