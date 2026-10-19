# Ashen Crowns — frontend

React + Vite + React Router + Bootstrap (только стандартные классы Bootstrap, без собственных CSS).

```bash
npm install
npm run dev      # http://localhost:5173, /api проксируется на backend
npm test         # Vitest (jsdom)
npm run build
```

Архитектура — FSD: `app → pages → widgets → features → entities → shared`.
Авторизация — серверная сессия в httpOnly-cookie; профиль всегда загружается с сервера (`GET /api/auth/me`),
в `localStorage` ничего не хранится.
