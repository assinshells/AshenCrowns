-- DEV: +1000 серебра всем игрокам.
--   docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/add_silver_1000.sql
-- Одному игроку — см. docker/postgres/dev/commands.md.
UPDATE users SET silver = silver + 1000, updated_at = NOW();
