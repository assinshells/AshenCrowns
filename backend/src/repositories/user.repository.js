import { pool } from "../config/database.js";
import { ATTRIBUTES, HEALTH_PER_CONSTITUTION } from "../constants/character.constants.js";

const COLUMNS =
  "id, login, email, password_hash, avatar_path, email_verified_at, created_at, " +
  "level, health, max_health, experience, experience_to_next, silver, rubies, " +
  "strength, giftedness, constitution, luck, attack_skill, defense_skill";

const UNIQUE_VIOLATION = "23505";

/**
 * Определяет, какой из уникальных индексов нарушен, по имени ограничения.
 * Имена задаются в docker/postgres/init.sql.
 */
const conflictField = (err) => {
  if (err?.code !== UNIQUE_VIOLATION) return null;
  if (String(err.constraint).includes("email")) return "email";
  if (String(err.constraint).includes("login")) return "login";
  return "unknown";
};

export const UserRepository = {
  async findByLogin(login) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM users WHERE lower(login) = lower($1)`,
      [login],
    );
    return rows[0] ?? null;
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  /**
   * @returns {Promise<{ user: object|null, conflict: "login"|"email"|"unknown"|null }>}
   * Гонки регистрации разруливает UNIQUE-индекс, а не предварительный SELECT.
   */
  async create({ login, email, passwordHash, emailVerified }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (login, email, password_hash, email_verified_at)
         VALUES ($1, $2, $3, CASE WHEN $4::boolean THEN NOW() ELSE NULL END)
         RETURNING ${COLUMNS}`,
        [login, email, passwordHash, emailVerified],
      );
      return { user: rows[0], conflict: null };
    } catch (err) {
      const conflict = conflictField(err);
      if (conflict) return { user: null, conflict };
      throw err;
    }
  },

  async markEmailVerified(id) {
    await pool.query(
      "UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1",
      [id],
    );
  },

  async updatePassword(id, passwordHash) {
    await pool.query(
      "UPDATE users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2",
      [passwordHash, id],
    );
  },

  /** @returns {Promise<boolean>} true, если запись была удалена */
  async deleteById(id) {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    return rowCount > 0;
  },

  /** @returns {Promise<boolean>} false, если email уже занят другим аккаунтом */
  async updateEmail(id, email) {
    try {
      await pool.query(
        "UPDATE users SET email = $1, email_verified_at = NOW(), updated_at = NOW() WHERE id = $2",
        [email, id],
      );
      return true;
    } catch (err) {
      if (conflictField(err) === "email") return false;
      throw err;
    }
  },

  /**
   * Повышает характеристику на 1, списывая серебро (цена — квадрат нового значения).
   * Одним атомарным UPDATE: проверка баланса и списание не разделены, поэтому
   * параллельные запросы не уведут серебро в минус и не повысят характеристику
   * без оплаты. Имя колонки берётся только из белого списка ATTRIBUTES.
   *
   * Телосложение дополнительно поднимает max_health, а текущее здоровье растёт
   * на ту же величину.
   * @returns {Promise<object|null>} обновлённый пользователь или null, если серебра не хватает
   */
  async upgradeAttribute(id, attribute) {
    const column = ATTRIBUTES[attribute];
    if (!column) throw new Error(`Unknown attribute: ${attribute}`);

    const health =
      attribute === "constitution"
        ? `, max_health = max_health + ${HEALTH_PER_CONSTITUTION}, health = health + ${HEALTH_PER_CONSTITUTION}`
        : "";

    const { rows } = await pool.query(
      `UPDATE users
          SET ${column} = ${column} + 1,
              silver = silver - ((${column} + 1)::bigint * (${column} + 1))${health},
              updated_at = NOW()
        WHERE id = $1
          AND silver >= (${column} + 1)::bigint * (${column} + 1)
        RETURNING ${COLUMNS}`,
      [id],
    );
    return rows[0] ?? null;
  },
};
