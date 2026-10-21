-- Карма игрока и работы (охрана ворот, работа в поле, грабёж). Запуск на существующей БД:
--   psql "$DATABASE_URL" -f docker/postgres/migrations/004_work_and_karma.sql

BEGIN;

-- Карма одним числом: > 0 — светлая, < 0 — тёмная.
ALTER TABLE users ADD COLUMN IF NOT EXISTS karma INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS work_sessions (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        VARCHAR(16)  NOT NULL CHECK (kind IN ('gate', 'field', 'robbery')),
    hours       SMALLINT     NOT NULL CHECK (hours BETWEEN 1 AND 8),
    silver      INTEGER      NOT NULL CHECK (silver >= 0),
    karma       INTEGER      NOT NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ends_at     TIMESTAMPTZ  NOT NULL,
    settled_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS work_sessions_one_active_per_user ON work_sessions (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS work_sessions_user_recent ON work_sessions (user_id, id DESC);

COMMIT;
