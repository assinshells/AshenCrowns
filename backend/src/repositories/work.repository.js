import { pool } from "../config/database.js";

const UNIQUE_VIOLATION = "23505";
const COLUMNS = "id, kind, hours, silver, karma, status, started_at, ends_at, settled_at";

export const WorkRepository = {
  /** @returns {Promise<object|null>} null, если у игрока уже есть активная работа */
  async create({ userId, kind, hours, silver, karma }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO works (user_id, kind, hours, silver, karma, ends_at)
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

  /** Активная работа (в том числе уже истёкшая, но ещё не зачисленная) и серверное время. */
  async findActive(userId) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}, NOW() AS server_time FROM works WHERE user_id = $1 AND status = 'active'`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async findLastFinished(userId) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM works
        WHERE user_id = $1 AND status <> 'active'
        ORDER BY id DESC LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async serverTime() {
    const { rows } = await pool.query("SELECT NOW() AS server_time");
    return rows[0].server_time;
  },

  /**
   * Зачисляет завершённую работу: серебро и карма игроку, статус → completed.
   * Один атомарный оператор: повторный/параллельный вызов не зачислит награду дважды
   * (вторая транзакция ждёт блокировку строки и после неё уже не находит активной работы).
   * @returns {Promise<boolean>} true, если награда была зачислена
   */
  async settleFinished(userId) {
    const { rowCount } = await pool.query(
      `WITH done AS (
         UPDATE works SET status = 'completed', settled_at = NOW()
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
      `UPDATE works SET status = 'cancelled', settled_at = NOW()
        WHERE user_id = $1 AND status = 'active' AND ends_at > NOW()`,
      [userId],
    );
    return rowCount > 0;
  },
};
