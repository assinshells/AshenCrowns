-- Схема для чистой установки (выполняется один раз при первом старте контейнера).
-- Для уже существующей БД используйте docker/postgres/migrations/.

CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    login               VARCHAR(20)  NOT NULL,
    email               VARCHAR(254) NOT NULL,
    password_hash       TEXT         NOT NULL,
    -- Только в БД (в UI/API не используется). NULL допустим: поле не запрашивается.
    gender              VARCHAR(6)   CHECK (gender IN ('male', 'female')),
    -- Путь к аватару; по умолчанию — стабильный статический аватар.
    avatar_path         TEXT         NOT NULL DEFAULT '/avatars/default.svg',
    -- Игровые параметры. DEFAULT — стартовые значения нового игрока (общие для всех).
    level               INTEGER      NOT NULL DEFAULT 1   CHECK (level >= 1),
    health              INTEGER      NOT NULL DEFAULT 75  CHECK (health >= 0),
    max_health          INTEGER      NOT NULL DEFAULT 75  CHECK (max_health > 0),
    experience          INTEGER      NOT NULL DEFAULT 0   CHECK (experience >= 0),
    experience_to_next  INTEGER      NOT NULL DEFAULT 5   CHECK (experience_to_next > 0),
    silver              INTEGER      NOT NULL DEFAULT 200 CHECK (silver >= 0),
    rubies              INTEGER      NOT NULL DEFAULT 0   CHECK (rubies >= 0),
    CONSTRAINT users_health_range CHECK (health <= max_health),
    email_verified_at   TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Уникальность без учёта регистра. Имена индексов используются backend'ом
-- (user.repository.js) для определения, какое поле занято.
CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_key ON users (lower(login));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));
