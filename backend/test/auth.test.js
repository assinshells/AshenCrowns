import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  setup,
  uniqueUser,
  lastCode,
  register,
  registerAndLogin,
  VALID_PASSWORD,
  OTHER_PASSWORD,
} from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup();
});
after(async () => ctx.teardown());

// ── Регистрация ──────────────────────────────────────────────────────────
test("регистрация: успех, пароль хранится хешем, сессия НЕ создаётся", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  const res = await register(ctx, c, u);

  assert.equal(res.status, 201);
  assert.equal(res.body.requiresEmailVerification, true);
  assert.ok(!res.body.maskedEmail.includes(u.email.split("@")[0]));
  assert.equal(c.cookie("ac_sid"), undefined, "активная сессия не должна создаваться");

  const { rows } = await ctx.pool.query("SELECT * FROM users WHERE email = $1", [u.email]);
  assert.equal(rows.length, 1);
  assert.match(rows[0].password_hash, /^scrypt\$/);
  assert.ok(!rows[0].password_hash.includes(u.password));
  assert.equal(rows[0].email_verified_at, null);
  assert.equal(rows[0].avatar_path, "/avatars/default.svg");
  assert.equal(rows[0].gender, null, "гендер хранится только в БД и не запрашивается");

  // защищённый ресурс недоступен
  assert.equal((await c.get("/api/auth/me")).status, 401);
});

test("регистрация: серверная валидация независима от клиента", async () => {
  const c = ctx.newClient();
  const base = { login: "valid_login", email: "valid@example.com", password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD };
  const cases = {
    "короткий пароль": { password: "Short1A", confirmPassword: "Short1A" },
    "нет заглавной": { password: "alllowercase1234", confirmPassword: "alllowercase1234" },
    "пароли не совпадают": { confirmPassword: OTHER_PASSWORD },
    "логин с пробелом": { login: "bad login" },
    "логин 21 символ": { login: "a".repeat(21) },
    "логин со спецсимволом": { login: "bad-login" },
    "плохой email": { email: "not-an-email" },
    "пароль-объект": { password: { $ne: "" }, confirmPassword: { $ne: "" } },
  };
  for (const [name, patch] of Object.entries(cases)) {
    const res = await c.post("/api/auth/register", { ...base, ...patch });
    assert.equal(res.status, 400, name);
    assert.equal(res.body.error.code, "VALIDATION_FAILED", name);
    assert.ok(res.body.error.details.length > 0, name);
  }
  const { rows } = await ctx.pool.query("SELECT count(*)::int AS n FROM users WHERE login = 'valid_login'");
  assert.equal(rows[0].n, 0);
});

test("регистрация: занятые логин/email (без учёта регистра) → 409", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  assert.equal((await register(ctx, c, u)).status, 201);

  const dupLogin = await register(ctx, c, { ...uniqueUser(), login: u.login.toUpperCase() });
  assert.equal(dupLogin.status, 409);
  assert.equal(dupLogin.body.error.code, "LOGIN_TAKEN");

  const dupEmail = await register(ctx, c, { ...uniqueUser(), email: u.email.toUpperCase() });
  assert.equal(dupEmail.status, 409);
  assert.equal(dupEmail.body.error.code, "EMAIL_TAKEN");
});

test("регистрация: гонка двух параллельных запросов — создаётся ровно один аккаунт", async () => {
  const u = uniqueUser();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => register(ctx, ctx.newClient(), u)),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 409));
});

// ── Подтверждение email + вход ───────────────────────────────────────────
test("вход запрещён до подтверждения email; после подтверждения — работает", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);

  const early = await c.post("/api/auth/login", { email: u.email, password: u.password });
  assert.equal(early.status, 403);
  assert.equal(early.body.error.code, "EMAIL_NOT_VERIFIED");
  assert.ok(early.body.error.maskedEmail.includes("***"));
  assert.equal(c.cookie("ac_sid"), undefined, "сессия не должна быть выдана");

  const ver = await c.post("/api/auth/verify-otp", {
    email: u.email, code: lastCode(ctx.EmailAdapter, u.email), purpose: "verify_email",
  });
  assert.equal(ver.status, 200);
  assert.equal(ver.body.verified, true);
  assert.equal(c.cookie("ac_sid"), undefined, "подтверждение email не логинит автоматически");

  const ok = await c.post("/api/auth/login", { email: u.email, password: u.password });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.login, u.login);
});

test("вход: профиль с сервера, маска email, аватар по умолчанию, без хеша и полного email", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const me = await client.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.user.login, user.login);
  assert.equal(me.body.user.avatarPath, "/avatars/default.svg");
  assert.ok(me.body.user.maskedEmail.includes("***"));
  const raw = JSON.stringify(me.body);
  assert.ok(!raw.includes(user.email), "полный email не раскрывается");
  assert.ok(!raw.includes("password"), "хеш пароля не отдаётся");
  assert.ok(!("gender" in me.body.user));
});

test("cookie сессии: HttpOnly, SameSite=Strict, sid не равен csrf", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  await c.post("/api/auth/verify-otp", { email: u.email, code: lastCode(ctx.EmailAdapter, u.email), purpose: "verify_email" });
  const res = await c.post("/api/auth/login", { email: u.email, password: u.password });
  const sid = c.rawSetCookie(res.res, "ac_sid");
  assert.match(sid, /HttpOnly/i);
  assert.match(sid, /SameSite=Strict/i);
  const csrf = c.rawSetCookie(res.res, "ac_csrf");
  assert.doesNotMatch(csrf, /HttpOnly/i, "csrf-cookie читается JS (double-submit)");
  assert.notEqual(c.cookie("ac_sid"), c.cookie("ac_csrf"));
});

test("вход: неверные данные дают одинаковый ответ для несуществующего и существующего email", async () => {
  const { user } = await registerAndLogin(ctx);
  const c = ctx.newClient();
  const wrongPass = await c.post("/api/auth/login", { email: user.email, password: "Wrong_Password1" });
  const noUser = await c.post("/api/auth/login", { email: "nobody@example.com", password: "Wrong_Password1" });
  assert.equal(wrongPass.status, 401);
  assert.equal(noUser.status, 401);
  assert.deepEqual(wrongPass.body, noUser.body);
});

test("вход: после 5 неудачных попыток аккаунт блокируется, даже верный пароль не пускает", async () => {
  const { user } = await registerAndLogin(ctx);
  const c = ctx.newClient();
  for (let i = 0; i < 5; i++) {
    const r = await c.post("/api/auth/login", { email: user.email, password: "Wrong_Password1" });
    assert.equal(r.status, 401);
  }
  const locked = await c.post("/api/auth/login", { email: user.email, password: user.password });
  assert.equal(locked.status, 429);
  assert.equal(locked.body.error.code, "ACCOUNT_LOCKED");
  assert.ok(locked.body.error.retryAfterSeconds > 0);
  assert.equal(c.cookie("ac_sid"), undefined);
});

test("новый логин создаёт новый sid (защита от session fixation)", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const first = client.cookie("ac_sid");
  await client.post("/api/auth/login", { email: user.email, password: user.password });
  assert.notEqual(client.cookie("ac_sid"), first);
});

// ── Выход ────────────────────────────────────────────────────────────────
test("выход: серверная сессия уничтожается, cookie очищаются, старый sid не работает", async () => {
  const { client } = await registerAndLogin(ctx);
  const stolenSid = client.cookie("ac_sid");

  const out = await client.post("/api/auth/logout", {});
  assert.equal(out.status, 200);
  assert.equal(client.cookie("ac_sid"), undefined);
  assert.equal(client.cookie("ac_csrf"), undefined);

  // «Украденный» sid после выхода должен быть мёртв на сервере.
  const replay = ctx.newClient();
  replay.cookies.set("ac_sid", { value: stolenSid, attrs: [] });
  assert.equal((await replay.get("/api/auth/me")).status, 401);
});

test("несуществующий/подделанный sid → 401", async () => {
  const c = ctx.newClient();
  c.cookies.set("ac_sid", { value: "A".repeat(43), attrs: [] });
  assert.equal((await c.get("/api/auth/me")).status, 401);
  c.cookies.set("ac_sid", { value: "short", attrs: [] });
  assert.equal((await c.get("/api/auth/me")).status, 401);
});

// ── CSRF ─────────────────────────────────────────────────────────────────
test("CSRF: изменяющие запросы без токена / с чужим токеном / с чужим Origin отклоняются", async () => {
  const { client } = await registerAndLogin(ctx);

  const noHeader = await client.post("/api/auth/logout", {}, { csrf: false });
  assert.equal(noHeader.status, 403);
  assert.equal(noHeader.body.error.code, "CSRF_TOKEN_INVALID");

  const wrong = await client.post("/api/auth/logout", {}, { headers: { "X-CSRF-Token": "0".repeat(64) } });
  assert.equal(wrong.status, 403);

  const evil = await client.post("/api/auth/logout", {}, { headers: { Origin: "https://evil.example" } });
  assert.equal(evil.status, 403);

  // сессия пережила все атаки
  assert.equal((await client.get("/api/auth/me")).status, 200);

  // login/register тоже защищены (login-CSRF)
  const anon = ctx.newClient();
  const loginNoCsrf = await anon.post("/api/auth/login", { email: "a@b.com", password: "x" }, { csrf: false });
  assert.equal(loginNoCsrf.status, 403);
});

// ── OTP ──────────────────────────────────────────────────────────────────
test("OTP: одноразовый — повторное использование того же кода невозможно", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const code = lastCode(ctx.EmailAdapter, u.email);
  const body = { email: u.email, code, purpose: "verify_email" };
  assert.equal((await c.post("/api/auth/verify-otp", body)).status, 200);
  const again = await c.post("/api/auth/verify-otp", body);
  assert.equal(again.status, 400);
  assert.equal(again.body.error.code, "OTP_EXPIRED");
});

test("OTP: параллельные запросы с верным кодом — успешен ровно один", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const code = lastCode(ctx.EmailAdapter, u.email);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => c.post("/api/auth/verify-otp", { email: u.email, code, purpose: "verify_email" })),
  );
  assert.equal(results.filter((r) => r.status === 200).length, 1);
});

test("OTP: перебор — после 5 неверных попыток код сгорает, верный код уже не работает", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const real = lastCode(ctx.EmailAdapter, u.email);
  const wrong = real === "000000" ? "111111" : "000000";

  for (let i = 1; i <= 4; i++) {
    const r = await c.post("/api/auth/verify-otp", { email: u.email, code: wrong, purpose: "verify_email" });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, "OTP_INVALID", `попытка ${i}`);
  }
  const fifth = await c.post("/api/auth/verify-otp", { email: u.email, code: wrong, purpose: "verify_email" });
  assert.equal(fifth.body.error.code, "OTP_TOO_MANY_ATTEMPTS");

  const late = await c.post("/api/auth/verify-otp", { email: u.email, code: real, purpose: "verify_email" });
  assert.equal(late.status, 400, "верный код после блокировки не принимается");
  const { rows } = await ctx.pool.query("SELECT email_verified_at FROM users WHERE email = $1", [u.email]);
  assert.equal(rows[0].email_verified_at, null);
});

test("OTP: срок действия — истёкший код отклоняется с понятным сообщением", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const code = lastCode(ctx.EmailAdapter, u.email);
  // Эмулируем истечение TTL.
  await ctx.redisClient.del(`otp:verify_email:${u.email}`);
  const r = await c.post("/api/auth/verify-otp", { email: u.email, code, purpose: "verify_email" });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "OTP_EXPIRED");
  assert.match(r.body.error.message, /истёк/);
});

test("OTP: у ключа есть TTL, а в Redis нет самого кода (только HMAC)", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const code = lastCode(ctx.EmailAdapter, u.email);
  const key = `otp:verify_email:${u.email}`;
  const ttl = await ctx.redisClient.ttl(key);
  assert.ok(ttl > 0 && ttl <= 600, `ttl=${ttl}`);
  const dump = JSON.stringify(await ctx.redisClient.hGetAll(key));
  assert.ok(!dump.includes(code) || code.length < 6, "код не хранится в открытом виде");
  assert.match(await ctx.redisClient.hGet(key, "h"), /^[0-9a-f]{64}$/);
});

test("OTP: код одного сценария не подходит для другого", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u); // выдан verify_email
  const code = lastCode(ctx.EmailAdapter, u.email);
  const r = await c.post("/api/auth/verify-otp", { email: u.email, code, purpose: "reset_password" });
  assert.equal(r.status, 400, "нет записи reset_password для этого email");
});

test("OTP: повторная отправка — пауза 60 с, потом доступна; новый код заменяет старый", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u);
  const first = lastCode(ctx.EmailAdapter, u.email);

  const tooSoon = await c.post("/api/auth/resend-otp", { email: u.email, purpose: "verify_email" });
  assert.equal(tooSoon.status, 429);
  assert.equal(tooSoon.body.error.code, "OTP_RESEND_COOLDOWN");
  assert.ok(tooSoon.body.error.retryAfterSeconds > 0 && tooSoon.body.error.retryAfterSeconds <= 60);

  await ctx.clearCooldowns(); // эмулируем прошедшую минуту
  const sent = await c.post("/api/auth/resend-otp", { email: u.email, purpose: "verify_email" });
  assert.equal(sent.status, 200);
  assert.equal(sent.body.resendAfterSeconds, 60);
  await new Promise((r) => setTimeout(r, 50)); // фоновая отправка
  const second = lastCode(ctx.EmailAdapter, u.email);

  if (second !== first) {
    const old = await c.post("/api/auth/verify-otp", { email: u.email, code: first, purpose: "verify_email" });
    assert.equal(old.status, 400, "старый код недействителен");
  }
  assert.equal((await c.post("/api/auth/verify-otp", { email: u.email, code: second, purpose: "verify_email" })).status, 200);
});

test("OTP: часовой лимит отправок", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  await register(ctx, c, u); // отправка №1
  let last;
  for (let i = 0; i < 5; i++) {
    await ctx.clearCooldowns();
    last = await c.post("/api/auth/resend-otp", { email: u.email, purpose: "verify_email" });
  }
  assert.equal(last.status, 429);
  assert.equal(last.body.error.code, "OTP_SEND_LIMIT");
});

// ── Восстановление пароля ────────────────────────────────────────────────
test("forgot-password: одинаковый ответ для существующего и несуществующего email", async () => {
  const { user } = await registerAndLogin(ctx);
  const c = ctx.newClient();
  const known = await c.post("/api/auth/forgot-password", { email: user.email });
  const unknown = await c.post("/api/auth/forgot-password", { email: "ghost@example.com" });
  assert.equal(known.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(Object.keys(known.body).sort(), Object.keys(unknown.body).sort());
  assert.ok(!JSON.stringify(known.body).includes(user.email));
  // у несуществующего пауза тоже действует — API не выдаёт наличие аккаунта
  const again = await c.post("/api/auth/forgot-password", { email: "ghost@example.com" });
  assert.equal(again.status, 429);
});

test("восстановление пароля: код → токен → новый пароль; токен одноразовый; все сессии завершаются", async () => {
  const { client: oldSession, user } = await registerAndLogin(ctx);
  const second = ctx.newClient();
  await second.post("/api/auth/login", { email: user.email, password: user.password });
  assert.equal((await second.get("/api/auth/me")).status, 200);

  const c = ctx.newClient();
  assert.equal((await c.post("/api/auth/forgot-password", { email: user.email })).status, 200);
  await new Promise((r) => setTimeout(r, 50));
  const code = lastCode(ctx.EmailAdapter, user.email);
  const ver = await c.post("/api/auth/verify-otp", { email: user.email, code, purpose: "reset_password" });
  assert.equal(ver.status, 200);
  assert.match(ver.body.resetToken, /^[0-9a-f]{64}$/);

  const weak = await c.post("/api/auth/reset-password", { resetToken: ver.body.resetToken, password: "weak", confirmPassword: "weak" });
  assert.equal(weak.status, 400);

  const mismatch = await c.post("/api/auth/reset-password", { resetToken: ver.body.resetToken, password: OTHER_PASSWORD, confirmPassword: VALID_PASSWORD });
  assert.equal(mismatch.status, 400);

  const done = await c.post("/api/auth/reset-password", { resetToken: ver.body.resetToken, password: OTHER_PASSWORD, confirmPassword: OTHER_PASSWORD });
  assert.equal(done.status, 200);

  const reuse = await c.post("/api/auth/reset-password", { resetToken: ver.body.resetToken, password: "Third_Password_3x", confirmPassword: "Third_Password_3x" });
  assert.equal(reuse.status, 403, "токен одноразовый");
  assert.equal(reuse.body.error.code, "RESET_TOKEN_INVALID");

  assert.equal((await oldSession.get("/api/auth/me")).status, 401, "старая сессия №1 завершена");
  assert.equal((await second.get("/api/auth/me")).status, 401, "старая сессия №2 завершена");

  const fresh = ctx.newClient();
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: user.password })).status, 401);
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: OTHER_PASSWORD })).status, 200);
});

test("reset-password: подделанный токен отклоняется", async () => {
  const c = ctx.newClient();
  const r = await c.post("/api/auth/reset-password", { resetToken: "f".repeat(64), password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
  assert.equal(r.status, 403);
});

// ── Прочее ───────────────────────────────────────────────────────────────
test("ответы об ошибках не содержат stack/внутренних деталей; некорректный JSON → 400", async () => {
  const c = ctx.newClient();
  await c.get("/api/auth/csrf");
  const res = await fetch(`${c.baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", Cookie: `ac_csrf=${c.cookie("ac_csrf")}`, "X-CSRF-Token": c.cookie("ac_csrf") },
    body: "{broken",
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(!JSON.stringify(body).includes("stack"));

  const nf = await c.get("/api/nope");
  assert.equal(nf.status, 404);
});

test("защищённые эндпоинты аккаунта требуют сессию", async () => {
  const c = ctx.newClient();
  for (const path of ["/api/account/password/request", "/api/account/email/request", "/api/account/password/confirm", "/api/account/email/confirm"]) {
    assert.equal((await c.post(path, {})).status, 401, path);
  }
});
