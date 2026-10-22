import { riskBand } from "../constants/world.constants.js";

/**
 * Состояние города события для клиента:
 *  open — идёт; upcoming — назначено и ещё не началось; closed — завершено/отменено; unscheduled — дат нет.
 */
export const eventState = (row, now) => {
  if (row.world_event_id == null) return null;
  if (row.event_open) return "open";
  if (row.event_status === "scheduled" && row.event_starts_at && new Date(row.event_starts_at) > now) return "upcoming";
  if (row.event_status === "unscheduled") return "unscheduled";
  return "closed";
};

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Город для списка/карты. Числовые коэффициенты риска и служебные id событий клиенту не отдаются. */
export const toCityDto = (row, { currentCityId, now }) => {
  const state = eventState(row, now);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    requiredLevel: row.required_level,
    accessible: row.accessible,
    isCurrent: row.id === currentCityId,
    event: state
      ? {
          state,
          // Даты показываем только у назначенных событий.
          startsAt: state === "unscheduled" ? null : iso(row.event_starts_at),
          endsAt: state === "unscheduled" ? null : iso(row.event_ends_at),
          timezone: row.event_timezone,
        }
      : null,
  };
};

/** Локация: уровень риска — словесный (risk_coefficient остаётся серверным параметром баланса). */
export const toLocationDto = (row) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  requiredLevel: row.unlock_level,
  requiresQuest: row.requires_quest,
  accessible: row.accessible,
  risk: riskBand(row.risk_coefficient),
});
