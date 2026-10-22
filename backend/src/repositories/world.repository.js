import { pool } from "../config/database.js";

/** Доступ к данным мира. Правила доступа (уровень, окно события) живут в SQL-функциях world_*_access. */
export const WorldRepository = {
  async listCities(level, at = new Date()) {
    const { rows } = await pool.query(
      `SELECT c.id, c.code, c.name, c.kind, c.unlock_level, c.world_event_id,
              world_city_access(c.id::smallint, $1, $2) AS accessible
         FROM cities c
        ORDER BY c.kind, c.sort_order, c.id`,
      [level, at],
    );
    return rows;
  },

  async listLocations(cityId) {
    const { rows } = await pool.query(
      `SELECT id, city_id, code, name, sort_order, unlock_level, required_quest_code,
              risk_coefficient::float8 AS risk_coefficient
         FROM locations WHERE city_id = $1 ORDER BY sort_order`,
      [cityId],
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
