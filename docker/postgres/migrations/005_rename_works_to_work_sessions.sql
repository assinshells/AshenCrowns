-- Таблица работ называется work_sessions. Если 004 уже была применена в прежней редакции
-- (таблица works), переименовываем её вместе с индексами; на свежей БД — ничего не делает.
--   psql "$DATABASE_URL" -f docker/postgres/migrations/005_rename_works_to_work_sessions.sql

DO $$
BEGIN
  IF to_regclass('public.works') IS NOT NULL AND to_regclass('public.work_sessions') IS NULL THEN
    ALTER TABLE works RENAME TO work_sessions;
    ALTER INDEX IF EXISTS works_one_active_per_user RENAME TO work_sessions_one_active_per_user;
    ALTER INDEX IF EXISTS works_user_recent RENAME TO work_sessions_user_recent;
  END IF;
END $$;
