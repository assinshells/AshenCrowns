-- DEV: +1 уровень всем игрокам, опыт текущего уровня сбрасывается в 0.
-- Порог опыта считается по формуле 5 · уровень² (уровень 2 → 20, 3 → 45 …), в БД его менять не нужно.
--   docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/level_up.sql
-- Одному игроку — см. docker/postgres/dev/commands.md.
UPDATE users SET level = level + 1, experience = 0, updated_at = NOW();
