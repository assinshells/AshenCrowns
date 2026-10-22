import { pool } from "../config/database.js";

const CITY_COLUMNS = `
  c.id, c.code, c.name, c.kind, c.unlock_level, c.world_event_id,
  GREATEST(c.unlock_level, COALESCE(e.min_level, 1)) AS required_level,
  e.status AS event_status, e.starts_at AS event_starts_at, e.ends_at AS event_ends_at,
  e.timezone AS event_timezone,
  world_city_access(c.id, $1, $2) AS accessible,
  CASE WHEN c.world_event_id IS NULL THEN NULL ELSE world_event_is_open(c.world_event_id, $2) END AS event_open`;

/** Доступ к данным мира. Правила доступа (уровень, окно события) живут в SQL-функциях world_*_access. */
export const WorldRepository = {
  async listCities(level, at = new Date()) {
    const { rows } = await pool.query(
      `SELECT ${CITY_COLUMNS}
         FROM cities c
         LEFT JOIN world_events e ON e.id = c.world_event_id
        ORDER BY (c.kind = 'event'), c.sort_order, c.id`,
      [level, at],
    );
    return rows;
  },

  async findCity(cityId, level, at = new Date()) {
    const { rows } = await pool.query(
      `SELECT ${CITY_COLUMNS}
         FROM cities c
         LEFT JOIN world_events e ON e.id = c.world_event_id
        WHERE c.id = $3`,
      [level, at, cityId],
    );
    return rows[0] ?? null;
  },

  async listLocations(cityId, level, at = new Date(), completedQuests = []) {
    const { rows } = await pool.query(
      `SELECT l.id, l.city_id, l.code, l.name, l.sort_order, l.unlock_level,
              (l.required_quest_code IS NOT NULL) AS requires_quest,
              l.risk_coefficient::float8 AS risk_coefficient,
              world_location_access(l.id, $2, $3, $4::text[]) AS accessible
         FROM locations l WHERE l.city_id = $1 ORDER BY l.sort_order`,
      [cityId, level, at, completedQuests],
    );
    return rows;
  },

  async canAccessCity(cityId, level, at = new Date()) {
    const { rows } = await pool.query("SELECT world_city_access($1::smallint, $2, $3) AS ok", [cityId, level, at]);
    return rows[0].ok;
  },

  async canAccessLocation(locationId, level, at = new Date(), completedQuests = []) {
    const { rows } = await pool.query(
      "SELECT world_location_access($1::smallint, $2, $3, $4::text[]) AS ok",
      [locationId, level, at, completedQuests],
    );
    return rows[0].ok;
  },

  async syncEvents(now = new Date()) {
    const { rows } = await pool.query("SELECT opened, closed FROM world_events_sync($1)", [now]);
    return rows[0];
  },
};
