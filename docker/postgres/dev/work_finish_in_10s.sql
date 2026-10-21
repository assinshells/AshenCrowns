-- DEV: активная работа закончится через 10 секунд (для проверки без ожидания часов).
-- Страница хода работы раз в ≤5 с сверяется с сервером, поэтому «Принять оплату» появится
-- примерно через 10–15 секунд после запуска.
--   docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/work_finish_in_10s.sql
UPDATE work_sessions SET ends_at = NOW() + interval '10 seconds' WHERE status = 'active';
