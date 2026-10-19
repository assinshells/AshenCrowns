/**
 * Тестовое окружение. Интеграционные тесты работают с НАСТОЯЩИМИ PostgreSQL
 * и Redis (по умолчанию: postgre_test и Redis DB №1), а не с моками.
 *
 * Использование: в начале тест-файла вызвать `await setup({ ...overrides })`
 * до любых импортов приложения (env.js читает process.env при импорте).
 */
import http from "node:http";

const DEFAULT_ENV = {
  NODE_ENV: "test",
  LOG_LEVEL: "error",
  PORT: "0",
  CLIENT_URL: "http://localhost:5173",
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgre:root@localhost:5432/postgre_test",
  REDIS_URL: process.env.TEST_REDIS_URL ?? "redis://localhost:6379/1",
  OTP_SECRET: "test-otp-secret-test-otp-secret-test-otp-secret",
  EMAIL_TRANSPORT: "console",
  EMAIL_VERIFICATION_REQUIRED: "true",
  RATE_LIMIT_LOGIN_MAX: "1000",
  RATE_LIMIT_REGISTER_MAX: "1000",
  RATE_LIMIT_FORGOT_MAX: "1000",
  RATE_LIMIT_OTP_MAX: "1000",
  RATE_LIMIT_RESEND_MAX: "1000",
  RATE_LIMIT_RESET_MAX: "1000",
  RATE_LIMIT_ACCOUNT_MAX: "1000",
};

export const VALID_PASSWORD = "Str0ngPassword_1";
export const OTHER_PASSWORD = "An0therStrongPass_2";

export async function setup(overrides = {}) {
  Object.assign(process.env, DEFAULT_ENV, overrides);

  const { default: app } = await import("../src/app.js");
  const { connectDatabase, pool } = await import("../src/config/database.js");
  const { connectRedis, disconnectRedis, redisClient } = await import(
    "../src/config/redis.js"
  );
  const { EmailAdapter } = await import("../src/adapters/email.adapter.js");

  await connectDatabase();
  await connectRedis();
  await redisClient.flushDb();
  await pool.query("TRUNCATE users RESTART IDENTITY CASCADE");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    pool,
    redisClient,
    EmailAdapter,
    newClient: () => new Client(baseUrl),
    async clearCooldowns() {
      const keys = await redisClient.keys("otp_cd:*");
      if (keys.length) await redisClient.del(keys);
    },
    async teardown() {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
      await disconnectRedis();
    },
  };
}

/** Минимальный HTTP-клиент с cookie jar и автоматическим CSRF — как браузер. */
export class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
    this.headers = { Origin: "http://localhost:5173" };
  }

  #absorb(res) {
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split("; ");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const expired = attrs.some((a) => /^Expires=Thu, 01 Jan 1970/i.test(a));
      if (expired || value === "") this.cookies.delete(name);
      else this.cookies.set(name, { value, attrs });
    }
  }

  cookie(name) {
    return this.cookies.get(name)?.value;
  }

  rawSetCookie(res, name) {
    return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  }

  async request(method, path, { body, headers = {}, csrf = true } = {}) {
    const cookieHeader = [...this.cookies]
      .map(([k, v]) => `${k}=${v.value}`)
      .join("; ");

    const finalHeaders = {
      ...this.headers,
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    };

    if (csrf && method !== "GET" && !("X-CSRF-Token" in headers)) {
      if (!this.cookie("ac_csrf")) await this.request("GET", "/api/auth/csrf");
      finalHeaders["X-CSRF-Token"] = this.cookie("ac_csrf");
      finalHeaders.Cookie = [...this.cookies]
        .map(([k, v]) => `${k}=${v.value}`)
        .join("; ");
    }

    const res = await fetch(this.baseUrl + path, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.#absorb(res);
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json, res };
  }

  get = (path, opts) => this.request("GET", path, opts);
  post = (path, body, opts) => this.request("POST", path, { body, ...opts });
}

let counter = 0;
export const uniqueUser = () => {
  counter += 1;
  const n = `${Date.now().toString(36)}${counter}`.slice(-8);
  return { login: `user_${n}`, email: `user.${n}@example.com`, password: VALID_PASSWORD };
};

/** Последний код из «отправленных» писем для адреса. */
export const lastCode = (EmailAdapter, to) => {
  const mail = [...EmailAdapter.outbox].reverse().find((m) => m.to === to);
  if (!mail) throw new Error(`no mail for ${to}`);
  return mail.text.match(/\b(\d{6})\b/)[1];
};

export async function register(ctx, client, user) {
  const res = await client.post("/api/auth/register", {
    login: user.login,
    email: user.email,
    password: user.password,
    confirmPassword: user.password,
  });
  return res;
}

/** Регистрация + подтверждение email + вход. */
export async function registerAndLogin(ctx, client = ctx.newClient(), user = uniqueUser()) {
  const reg = await register(ctx, client, user);
  if (reg.status !== 201) throw new Error(`register failed: ${JSON.stringify(reg.body)}`);
  const code = lastCode(ctx.EmailAdapter, user.email);
  const ver = await client.post("/api/auth/verify-otp", {
    email: user.email,
    code,
    purpose: "verify_email",
  });
  if (ver.status !== 200) throw new Error(`verify failed: ${JSON.stringify(ver.body)}`);
  const login = await client.post("/api/auth/login", {
    email: user.email,
    password: user.password,
  });
  if (login.status !== 200) throw new Error(`login failed: ${JSON.stringify(login.body)}`);
  return { client, user, login };
}
