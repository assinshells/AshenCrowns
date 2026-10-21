# Ashen Crowns («Короны Пепла»)

Фундамент приложения: регистрация, вход, серверные сессии, OTP-подтверждение, восстановление пароля,
настройки безопасности и базовый адаптивный интерфейс. Игровые механики пока представлены заглушками.

- **Frontend:** React, Vite, React Router, Bootstrap (только стандартные классы, собственных CSS нет), Zustand, Axios. Архитектура FSD.
- **Backend:** Node.js (ESM), Express 5, PostgreSQL, Redis, nodemailer.

## Запуск (разработка, Docker)

```bash
cp .env.example .env
docker compose -f docker/dev/compose.yml --env-file .env up --build
```

| Сервис | Адрес |
|---|---|
| Приложение | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Mailpit (перехват писем с OTP) | http://localhost:8025 |

Письма с кодами в dev попадают в Mailpit — реальный SMTP не нужен.

## Запуск без Docker

```bash
# backend (нужны PostgreSQL и Redis)
cd backend && cp .env.example .env     # задайте OTP_SECRET: openssl rand -hex 32
psql "$DATABASE_URL" -f ../docker/postgres/init.sql
npm install && npm run dev

# frontend
cd frontend && npm install && npm run dev
```

В `EMAIL_TRANSPORT=console` (по умолчанию) письма с кодами печатаются в лог backend — **только для разработки**.

## Production

```bash
docker compose -f docker/prod/compose.yml --env-file .env up --build -d
```

Обязательные переменные: `CLIENT_URL` (публичный origin сайта, например `https://ashen.example.com`),
`OTP_SECRET`, `SMTP_HOST`, `SMTP_FROM` (+ `SMTP_USER`/`SMTP_PASS` при необходимости).
**Внешняя интеграция:** для OTP-писем нужен рабочий SMTP-сервер (или SMTP-API провайдера: SendGrid, Mailgun, SES…).
Backend в production не запустится с `EMAIL_TRANSPORT=console`. Termination TLS — на стороне внешнего прокси:
cookie получают флаг `Secure` при `NODE_ENV=production`, поэтому сайт должен открываться по HTTPS.

### Миграция существующей БД

`docker/postgres/init.sql` — схема для чистой установки. Для БД старой версии:
`psql "$DATABASE_URL" -f docker/postgres/migrations/001_auth_foundation.sql` (читайте комментарии в файле:
email стал обязательным, старые хеши паролей несовместимы — пользователям нужно восстановить пароль).

Игровые параметры (уровень, жизни, опыт, серебро, рубины) добавляет `migrations/002_player_stats.sql`;
характеристики персонажа (сила, одаренность, телосложение, удача, искусство атаки и защиты; старт — 3) добавляет
`migrations/003_character_attributes.sql`; карму игрока и таблицу работ `work_sessions` — `migrations/004_work_and_karma.sql` (если 004 применялась раньше, когда таблица называлась `works`, — затем `005_rename_works_to_work_sessions.sql`); стартовые значения заданы как `DEFAULT` колонок и отдаются в `stats` ответов `/api/auth/me` и `/api/auth/login`.

## Архитектура аутентификации

**Серверные сессии.** После входа backend создаёт случайный непрозрачный `sid` (32 байта), кладёт данные сессии в Redis
(ключ — SHA-256 от `sid`) и выдаёт его в cookie `ac_sid`: `HttpOnly`, `SameSite=Strict`, `Secure` в production.
Профиль всегда загружается с сервера (`GET /api/auth/me`); `localStorage` не используется. Сессии можно отозвать
мгновенно — поэтому при смене пароля завершаются **все** сессии пользователя (stateless-JWT так отозвать нельзя).
Каждый вход выдаёт новый `sid` (защита от session fixation); TTL скользящий (`SESSION_TTL_SECONDS`), абсолютный предел — 30 суток.

**CSRF.** Для всех изменяющих запросов `/api/*`: заголовок `Origin` (если есть) должен совпадать с `CLIENT_URL`
и значение cookie `ac_csrf` должно совпасть с заголовком `X-CSRF-Token` (double-submit). Токен выдаёт `GET /api/auth/csrf`.

**Пароли.** scrypt (N=2^15, r=8, p=1), уникальная соль, параметры хранятся в хеше. При входе несуществующего
пользователя выполняется «холостое» хеширование (выравнивание времени ответа).

**Перебор.** Лимиты по IP на регистрацию/вход/OTP/восстановление (Redis); блокировка входа по email после
`LOGIN_MAX_FAILURES` неудач на `LOGIN_LOCK_SECONDS`; тот же счётчик защищает «текущий пароль» в настройках.

### Политики ввода

Требования в ТЗ содержали две разные цифры (20 и 12) — реализовано так:

| Поле | Правило |
|---|---|
| Логин | 3–20 символов; латиница, кириллица, цифры, `_` (в начале/середине/конце); пробелы и другие символы запрещены. Уникален без учёта регистра |
| Пароль | 12–64 символа; минимум 1 строчная, 1 заглавная буква (латиница/кириллица), 1 цифра; пробелы запрещены, прочие символы допустимы |
| Email | Нормализуется в нижний регистр; уникален без учёта регистра; в интерфейсе показывается только в маске (`j***e@g***l.com`) |
| Gender | Только в БД (`male`/`female`, допускается NULL), в UI и API не участвует |

Правила сосредоточены в `backend/src/validators/auth.validator.js` и `frontend/src/shared/constants/app.js`.

### Сценарии OTP

Шестизначный код, TTL `OTP_TTL_SECONDS` (10 мин), не более `OTP_MAX_ATTEMPTS` (5) неверных попыток, затем код сгорает;
повторная отправка не чаще 1 раза в `OTP_RESEND_COOLDOWN_SECONDS` (60 с) и не более 5 раз в час; код одноразовый
(атомарное удаление при успешной проверке); в Redis хранится только HMAC-SHA256 от (сценарий, субъект, код), поэтому код
одного сценария не подходит для другого. Единая страница `/verify-otp` явно показывает сценарий:

| Сценарий | Когда | Куда отправляется | Результат |
|---|---|---|---|
| `verify_email` | Регистрация (`EMAIL_VERIFICATION_REQUIRED=true`) или вход с неподтверждённым email | на email аккаунта | email подтверждён → вход на `/login` |
| `reset_password` | «Забыли пароль?» | на email аккаунта | одноразовый токен → `/reset-password` |
| `change_password` | Настройки → смена пароля | на **текущий** email | пароль обновлён, все сессии завершены → `/login` |
| `change_email` | Настройки → смена email | на **новый** email | email обновлён, уведомление на прежний адрес, сессии сохраняются |

Для операций в настройках дополнительно требуется текущий пароль (повторная проверка личности).
Ответы «забыли пароль» одинаковы для существующих и несуществующих email (нет перечисления аккаунтов).

## API

| Метод | Путь | Доступ |
|---|---|---|
| GET | `/api/auth/csrf` | публичный |
| POST | `/api/auth/register`, `/login`, `/forgot-password`, `/verify-otp`, `/resend-otp`, `/reset-password` | публичный (CSRF + rate-limit) |
| POST | `/api/auth/logout` | CSRF |
| GET | `/api/auth/me` | сессия |
| POST | `/api/character/attributes/upgrade` | сессия + CSRF; тело `{ attribute }` (`strength`, `giftedness`, `constitution`, `luck`, `attack`, `defense`); +1 за серебро (цена — квадрат текущего значения), ответ — `stats`; 409 `INSUFFICIENT_SILVER` |
| GET | `/api/work` | сессия; каталог наград (серебро и карма на 1–8 ч), активная работа (`finished` — время вышло, ждёт оплаты), серверное время |
| POST | `/api/work/start` | сессия + CSRF; тело `{ kind, hours }` (`gate`, `field`, `robbery`; 1–8); 409 `ALREADY_WORKING` |
| POST | `/api/work/cancel` | сессия + CSRF; отмена идущей работы без подтверждения, ничего не зачисляется |
| POST | `/api/work/claim` | сессия + CSRF; «Принять оплату»: зачисляет серебро и карму завершённой работы (ровно один раз), ответ — `stats`; 409 `NOTHING_TO_CLAIM` |
| POST | `/api/account/password/request`, `/password/confirm`, `/email/request`, `/email/confirm`, `/otp/resend` | сессия + CSRF |

## Маршруты интерфейса

Публичные: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-otp`.
Защищённые (редирект на `/login`, после входа — возврат на исходную страницу из белого списка): `/` (персонаж), `/stats` (характеристики), `/karma` (силы кармы), `/work` (работа),
(`/work/progress` — ход работы: по прямой ссылке открывается только переходом со страницы «Работа»),
`/settings/security`, `/settings/notifications`, а также заглушки `/about`, `/rules`, `/support`, `/version`.

## Тесты

```bash
cd backend && npm test      # интеграционные: нужны PostgreSQL (БД postgre_test) и Redis (DB 1)
cd frontend && npm test     # Vitest + Testing Library
```

Переменные тестового окружения: `TEST_DATABASE_URL`, `TEST_REDIS_URL`. Схема тестовой БД: `docker/postgres/init.sql`.
Тесты очищают таблицу `users` и Redis DB — не направляйте их на рабочие данные.

## Не реализовано / решения на будущее

- Двухфакторная аутентификация при входе (OTP как второй фактор) — не реализована; инфраструктура OTP готова.
- Загрузка собственного аватара (пока только путь в БД и статический аватар по умолчанию).
- Управление списком активных сессий пользователя (сейчас — только завершение всех при смене пароля).
- Страницы уведомлений, правил, поддержки и т. д. — заглушки.

## Игровые формулы

- Цена повышения характеристики — квадрат её текущего значения (с 3 стоит 9, с 10 на 11 — 100).
- Опыт до следующего уровня: `5 · уровень²` (1 → 5, 2 → 20, 3 → 45, 4 → 80, 5 → 125, 20 → 2000, 30 → 4500).
- Генерация пунктов жизни в час: `⌊10 + телосложение · 0.6⌋` (телосложение 3 → 11, 10 → 16); пока только отображается.
- Карма хранится одним числом: светлая и тёмная гасят друг друга и не бывают отрицательными.
- Награды за работу — `backend/src/constants/work.constants.js`; серебро и карма зачисляются только по кнопке «Принять оплату».

## Команды для разработки (dev)

Полный список (окончание работы, +1000 серебра, +1 уровень) — `docker/postgres/dev/commands.md`.

### Проверка работ без ожидания

Время работы — часы, поэтому в разработке конец можно сдвинуть прямо в БД (контейнер `ashen-postgres-dev`).
Страница хода работы сверяется с сервером не реже раза в 5 секунд, поэтому подхватит изменение без перезагрузки:

```bash
# закончится через 10 секунд — «Принять оплату» появится примерно через 10–15 с
docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/work_finish_in_10s.sql
# закончить прямо сейчас
docker exec -i ashen-postgres-dev psql -U postgre -d postgre < docker/postgres/dev/work_finish_now.sql
```

Скрипты меняют `work_sessions.ends_at` у всех активных работ — только для разработки.
