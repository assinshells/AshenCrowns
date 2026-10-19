-- Игровые параметры игрока (уровень, жизни, опыт, серебро, рубины).
-- Запуск на существующей БД:
--   psql "$DATABASE_URL" -f docker/postgres/migrations/002_player_stats.sql
-- Стартовые значения (DEFAULT) получают и уже существующие пользователи.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS level              INTEGER NOT NULL DEFAULT 1   CHECK (level >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS health             INTEGER NOT NULL DEFAULT 75  CHECK (health >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_health         INTEGER NOT NULL DEFAULT 75  CHECK (max_health > 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience         INTEGER NOT NULL DEFAULT 0   CHECK (experience >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_to_next INTEGER NOT NULL DEFAULT 5   CHECK (experience_to_next > 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS silver             INTEGER NOT NULL DEFAULT 200 CHECK (silver >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rubies             INTEGER NOT NULL DEFAULT 0   CHECK (rubies >= 0);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_health_range;
ALTER TABLE users ADD CONSTRAINT users_health_range CHECK (health <= max_health);

COMMIT;
