-- Миграция существующей БД (старая схема: login/email/gender с 'unknown')
-- к схеме текущей версии. Запуск:
--   psql "$DATABASE_URL" -f docker/postgres/migrations/001_auth_foundation.sql
--
-- ВНИМАНИЕ: email теперь обязателен. Если в БД есть пользователи без email,
-- миграция остановится на SET NOT NULL — заполните или удалите такие записи.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT NOT NULL DEFAULT '/avatars/default.svg';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Гендер: только м/ж, значение 'unknown' больше не допускается.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE users ALTER COLUMN gender DROP NOT NULL;
UPDATE users SET gender = NULL WHERE gender NOT IN ('male', 'female');
ALTER TABLE users ADD CONSTRAINT users_gender_check CHECK (gender IN ('male', 'female'));

-- Email обязателен; уже существующие адреса считаем подтверждёнными.
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL;

-- Старый формат хеша (salt:hash) несовместим с новым (scrypt$N$r$p$salt$hash):
-- такие пользователи должны восстановить пароль через «Забыли пароль?».

-- Уникальность без учёта регистра.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS idx_users_login;
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX IF NOT EXISTS users_login_lower_key ON users (lower(login));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

COMMIT;
