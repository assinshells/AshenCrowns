# Команды для разработки (dev)

Только для локальной разработки. Нужен запущенный dev-стек (`docker compose -f docker/dev/compose.yml --env-file .env up`):
контейнер БД называется `ashen-postgres-dev`, пользователь и база по умолчанию — `postgre` / `postgre`
(если меняли `POSTGRES_USER` / `POSTGRES_DB` в `.env` — подставьте свои).

Команды вида `-c "..."` работают в любой оболочке (bash, PowerShell, cmd). Запуск файла через `< файл.sql`
работает в bash/zsh; в PowerShell вместо него: `Get-Content docker/postgres/dev/файл.sql | docker exec -i ashen-postgres-dev psql -U postgre -d postgre`.

После изменения данных в БД игровые параметры (серебро, уровень) в интерфейсе обновятся после перезагрузки страницы (F5):
профиль запрашивается при загрузке. Страница хода работы сверяется с сервером сама, раз в ≤5 секунд.

Интерактивная консоль БД: `docker exec -it ashen-postgres-dev psql -U postgre -d postgre`

## Работа

Сначала возьмите работу в игре («Работа» → «Взять работу») и оставьте страницу открытой, затем выполните команду в терминале
в корне репозитория.

| Что сделать | Команда |
|---|---|
| Закончить работу через 10 секунд | `docker exec ashen-postgres-dev psql -U postgre -d postgre -c "UPDATE work_sessions SET ends_at = NOW() + interval '10 seconds' WHERE status = 'active'"` |
| Закончить работу прямо сейчас | `docker exec ashen-postgres-dev psql -U postgre -d postgre -c "UPDATE work_sessions SET ends_at = NOW() WHERE status = 'active'"` |

Те же команды лежат файлами: `work_finish_in_10s.sql`, `work_finish_now.sql`.
Страница заметит новое время за ≤5 секунд, после конца времени появятся «Во время работы вы заработали…» и кнопка
«Принять оплату» (при команде «через 10 секунд» — примерно через 10–15 секунд). Серебро и карма зачислятся только после нажатия кнопки.

## Серебро: +1000

Всем игрокам (файл `add_silver_1000.sql`):

```bash
docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/add_silver_1000.sql
```

Одному игроку (замените `hero` на логин):

```bash
docker exec ashen-postgres-dev psql -U postgre -d postgre -c "UPDATE users SET silver = silver + 1000 WHERE lower(login) = lower('hero')"
```

## Уровень: +1

Опыт текущего уровня сбрасывается в 0, порог до следующего уровня — `5 · уровень²`.

Всем игрокам (файл `level_up.sql`):

```bash
docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/level_up.sql
```

Одному игроку (замените `hero` на логин):

```bash
docker exec ashen-postgres-dev psql -U postgre -d postgre -c "UPDATE users SET level = level + 1, experience = 0 WHERE lower(login) = lower('hero')"
```
