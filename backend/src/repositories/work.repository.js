import { pool } from "../config/database.js";

const UNIQUE_VIOLATION = "23505";
const COLUMNS = "id, kind, hours, silver, karma, status, started_at, ends_at, settled_at";

export const WorkRepository = {
  /** @returns {Promise<object|null>} null, если у игрока уже есть активная работа */
  async create({ userId, kind, hours, silver, karma }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO work_sessions (user_id, kind, hours, silver, karma, ends_at)
         VALUES ($1, $2, $3::smallint, $4, $5, NOW() + make_interval(hours => $3::smallint::int))
         RETURNING ${COLUMNS}, NOW() AS server_time`,
        [userId, kind, hours, silver, karma],
      );
      return rows[0];
    } catch (err) {
      if (err?.code === UNIQUE_VIOLATION) return null;
      throw err;
    }
  },

  /**
   * Работа, которая идёт или уже закончилась, но оплата ещё не принята, + серверное время.
   * Признак «закончилась» считается в БД теми же часами, что и зачисление.
   */
  async findActive(userId) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}, ends_at <= NOW() AS finished, NOW() AS server_time
         FROM work_sessions WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async serverTime() {
    const { rows } = await pool.query("SELECT NOW() AS server_time");
    return rows[0].server_time;
  },

  /**
   * «Принять оплату»: серебро и карма зачисляются игроку, статус → completed.
   * Один атомарный оператор: повторный/параллельный вызов не зачислит награду дважды
   * (вторая транзакция ждёт блокировку строки и после неё уже не находит активной работы).
   * Раньше конца времени не срабатывает.
   * @returns {Promise<boolean>} true, если награда была зачислена
   */
  async claim(userId) {
    const { rowCount } = await pool.query(
      `WITH done AS (
         UPDATE work_sessions SET status = 'completed', settled_at = NOW()
          WHERE user_id = $1 AND status = 'active' AND ends_at <= NOW()
         RETURNING silver, karma
       )
       UPDATE users
          SET silver = users.silver + done.silver,
              karma = users.karma + done.karma,
              updated_at = NOW()
         FROM done
        WHERE users.id = $1`,
      [userId],
    );
    return rowCount > 0;
  },

  /** Отмена работы, которая ещё идёт: ничего не зачисляется. @returns {Promise<boolean>} */
  async cancelActive(userId) {
    const { rowCount } = await pool.query(
      `UPDATE work_sessions SET status = 'cancelled', settled_at = NOW()
        WHERE user_id = $1 AND status = 'active' AND ends_at > NOW()`,
      [userId],
    );
    return rowCount > 0;
  },
};
