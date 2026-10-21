-- DEV: активная работа заканчивается прямо сейчас («Принять оплату» доступна сразу).
--   docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/work_finish_now.sql
UPDATE work_sessions SET ends_at = NOW() WHERE status = 'active';
