-- Характеристики персонажа: сила, одарённость, телосложение, удача,
-- искусство атаки и защиты. Запуск на существующей БД:
--   psql "$DATABASE_URL" -f docker/postgres/migrations/003_character_attributes.sql
-- Стартовое значение (DEFAULT 3) получают и уже существующие пользователи.
-- Телосложение 3 даёт 75 здоровья (25 за единицу) — как стартовое max_health.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS strength      INTEGER NOT NULL DEFAULT 3 CHECK (strength >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS giftedness    INTEGER NOT NULL DEFAULT 3 CHECK (giftedness >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS constitution  INTEGER NOT NULL DEFAULT 3 CHECK (constitution >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS luck          INTEGER NOT NULL DEFAULT 3 CHECK (luck >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS attack_skill  INTEGER NOT NULL DEFAULT 3 CHECK (attack_skill >= 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS defense_skill INTEGER NOT NULL DEFAULT 3 CHECK (defense_skill >= 1);

COMMIT;
