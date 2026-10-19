import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  setup,
  lastCode,
  registerAndLogin,
  VALID_PASSWORD,
  OTHER_PASSWORD,
} from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup();
});
after(async () => ctx.teardown());

const pwdBody = (over = {}) => ({
  currentPassword: VALID_PASSWORD,
  newPassword: OTHER_PASSWORD,
  confirmPassword: OTHER_PASSWORD,
  ...over,
});

// ── Смена пароля ─────────────────────────────────────────────────────────
test("смена пароля: валидация и проверка текущего пароля на сервере", async () => {
  const { client } = await registerAndLogin(ctx);

  const wrong = await client.post("/api/account/password/request", pwdBody({ currentPassword: "Wrong_Password1" }));
  assert.equal(wrong.status, 400, "400, а не 401 — клиент не должен разлогиниться");
  assert.equal(wrong.body.error.code, "CURRENT_PASSWORD_WRONG");

  const same = await client.post("/api/account/password/request", pwdBody({ newPassword: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }));
  assert.equal(same.status, 400);
  assert.match(JSON.stringify(same.body.error.details), /отличаться/);

  const weak = await client.post("/api/account/password/request", pwdBody({ newPassword: "weak", confirmPassword: "weak" }));
  assert.equal(weak.status, 400);

  const mismatch = await client.post("/api/account/password/request", pwdBody({ confirmPassword: "Different_Pass_3" }));
  assert.equal(mismatch.status, 400);

  // Ни одна из неудачных попыток не отправила код и не сменила пароль.
  assert.equal((await client.get("/api/auth/me")).status, 200);
});

test("смена пароля: код на ТЕКУЩИЙ email → подтверждение → ВСЕ сессии завершены, пароль новый", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const other = ctx.newClient();
  await other.post("/api/auth/login", { email: user.email, password: user.password });
  const hashBefore = (await ctx.pool.query("SELECT password_hash FROM users WHERE email=$1", [user.email])).rows[0].password_hash;

  const req = await client.post("/api/account/password/request", pwdBody());
  assert.equal(req.status, 200);
  assert.ok(req.body.maskedEmail.includes("***"));
  const code = lastCode(ctx.EmailAdapter, user.email); // письмо ушло на текущий адрес

  // До подтверждения пароль НЕ изменён.
  const hashMid = (await ctx.pool.query("SELECT password_hash FROM users WHERE email=$1", [user.email])).rows[0].password_hash;
  assert.equal(hashMid, hashBefore);

  const bad = await client.post("/api/account/password/confirm", { code: code === "000000" ? "111111" : "000000" });
  assert.equal(bad.status, 400);
  assert.equal((await client.get("/api/auth/me")).status, 200, "неверный код не разлогинивает");

  const ok = await client.post("/api/account/password/confirm", { code });
  assert.equal(ok.status, 200);
  assert.equal(client.cookie("ac_sid"), undefined, "cookie сессии очищена");

  assert.equal((await client.get("/api/auth/me")).status, 401, "текущая сессия завершена");
  assert.equal((await other.get("/api/auth/me")).status, 401, "другая сессия завершена");

  const fresh = ctx.newClient();
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: user.password })).status, 401);
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: OTHER_PASSWORD })).status, 200);

  // Повторное использование кода невозможно.
  const replay = await fresh.post("/api/account/password/confirm", { code });
  assert.equal(replay.status, 400);
});

test("смена пароля: нельзя подтвердить код чужой операции (код привязан к пользователю)", async () => {
  const a = await registerAndLogin(ctx);
  const b = await registerAndLogin(ctx);
  await a.client.post("/api/account/password/request", pwdBody());
  const codeA = lastCode(ctx.EmailAdapter, a.user.email);
  const r = await b.client.post("/api/account/password/confirm", { code: codeA });
  assert.equal(r.status, 400, "у пользователя B нет ожидающей операции");
  assert.equal((await b.client.get("/api/auth/me")).status, 200);
});

test("смена пароля: повторная отправка кода — пауза и сохранение операции", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await client.post("/api/account/password/request", pwdBody());
  const soon = await client.post("/api/account/otp/resend", { purpose: "change_password" });
  assert.equal(soon.status, 429);
  assert.equal(soon.body.error.code, "OTP_RESEND_COOLDOWN");

  await ctx.clearCooldowns();
  const again = await client.post("/api/account/otp/resend", { purpose: "change_password" });
  assert.equal(again.status, 200);
  const code = lastCode(ctx.EmailAdapter, user.email);
  assert.equal((await client.post("/api/account/password/confirm", { code })).status, 200);
  const fresh = ctx.newClient();
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: OTHER_PASSWORD })).status, 200);
});

test("resend без ожидающей операции → код истёк", async () => {
  const { client } = await registerAndLogin(ctx);
  const r = await client.post("/api/account/otp/resend", { purpose: "change_email" });
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "OTP_EXPIRED");
});

test("подбор текущего пароля через смену пароля блокируется общим счётчиком", async () => {
  const { client } = await registerAndLogin(ctx);
  for (let i = 0; i < 5; i++) {
    const r = await client.post("/api/account/password/request", pwdBody({ currentPassword: "Wrong_Password1" }));
    assert.equal(r.status, 400);
  }
  const locked = await client.post("/api/account/password/request", pwdBody());
  assert.equal(locked.status, 429);
  assert.equal(locked.body.error.code, "ACCOUNT_LOCKED");
});

// ── Смена email ──────────────────────────────────────────────────────────
test("смена email: код на НОВЫЙ адрес, основной email не меняется до подтверждения, сессии сохраняются", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const other = ctx.newClient();
  await other.post("/api/auth/login", { email: user.email, password: user.password });
  const newEmail = `new.${user.email}`;
  const outboxBefore = ctx.EmailAdapter.outbox.length;

  const req = await client.post("/api/account/email/request", { newEmail, currentPassword: user.password });
  assert.equal(req.status, 200);
  assert.ok(!JSON.stringify(req.body).includes(newEmail), "новый email маскируется в ответе");
  const code = lastCode(ctx.EmailAdapter, newEmail);
  assert.equal(ctx.EmailAdapter.outbox.length, outboxBefore + 1);

  let row = (await ctx.pool.query("SELECT email FROM users WHERE login=$1", [user.login])).rows[0];
  assert.equal(row.email, user.email, "до подтверждения email не изменён");

  const bad = await client.post("/api/account/email/confirm", { code: code === "000000" ? "111111" : "000000" });
  assert.equal(bad.status, 400);

  const ok = await client.post("/api/account/email/confirm", { code });
  assert.equal(ok.status, 200);
  row = (await ctx.pool.query("SELECT email, email_verified_at FROM users WHERE login=$1", [user.login])).rows[0];
  assert.equal(row.email, newEmail);
  assert.ok(row.email_verified_at);

  // Уведомление о событии безопасности ушло на прежний адрес.
  const notice = ctx.EmailAdapter.outbox.find((m) => m.to === user.email && /изменён/.test(m.text));
  assert.ok(notice, "уведомление на старый email");

  // Сессии НЕ завершаются.
  assert.equal((await client.get("/api/auth/me")).status, 200);
  assert.equal((await other.get("/api/auth/me")).status, 200);

  // Одноразовость и вход по новому адресу.
  assert.equal((await client.post("/api/account/email/confirm", { code })).status, 400);
  const fresh = ctx.newClient();
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: user.password })).status, 401);
  assert.equal((await fresh.post("/api/auth/login", { email: newEmail, password: user.password })).status, 200);
});

test("смена email: проверка пароля, занятого адреса, того же адреса и формата", async () => {
  const a = await registerAndLogin(ctx);
  const b = await registerAndLogin(ctx);

  const noPass = await a.client.post("/api/account/email/request", { newEmail: "free@example.com", currentPassword: "Wrong_Password1" });
  assert.equal(noPass.status, 400);
  assert.equal(noPass.body.error.code, "CURRENT_PASSWORD_WRONG");

  const taken = await a.client.post("/api/account/email/request", { newEmail: b.user.email.toUpperCase(), currentPassword: a.user.password });
  assert.equal(taken.status, 409);
  assert.equal(taken.body.error.code, "EMAIL_TAKEN");

  const same = await a.client.post("/api/account/email/request", { newEmail: a.user.email, currentPassword: a.user.password });
  assert.equal(same.status, 400);

  const bad = await a.client.post("/api/account/email/request", { newEmail: "nope", currentPassword: a.user.password });
  assert.equal(bad.status, 400);
});

test("смена email: если адрес заняли между запросом и подтверждением — 409, email не меняется", async () => {
  const a = await registerAndLogin(ctx);
  const target = `race.${a.user.email}`;
  await a.client.post("/api/account/email/request", { newEmail: target, currentPassword: a.user.password });
  const code = lastCode(ctx.EmailAdapter, target);

  // Другой пользователь успел занять адрес.
  await ctx.pool.query(
    "INSERT INTO users (login, email, password_hash) VALUES ($1,$2,'x')",
    [`race_${Date.now() % 100000}`, target],
  );
  const r = await a.client.post("/api/account/email/confirm", { code });
  assert.equal(r.status, 409);
  const row = (await ctx.pool.query("SELECT email FROM users WHERE login=$1", [a.user.login])).rows[0];
  assert.equal(row.email, a.user.email);
});

test("смена email: повторная отправка идёт на новый адрес", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const newEmail = `again.${user.email}`;
  await client.post("/api/account/email/request", { newEmail, currentPassword: user.password });
  await ctx.clearCooldowns();
  const before = ctx.EmailAdapter.outbox.length;
  assert.equal((await client.post("/api/account/otp/resend", { purpose: "change_email" })).status, 200);
  assert.equal(ctx.EmailAdapter.outbox.length, before + 1);
  assert.equal(ctx.EmailAdapter.outbox.at(-1).to, newEmail);
});

test("клиент не может подменить userId/email в теле запроса — используется только серверная сессия", async () => {
  const a = await registerAndLogin(ctx);
  const b = await registerAndLogin(ctx);
  // Клиент пытается подсунуть чужой userId/email — сервер игнорирует, берёт из сессии.
  const r = await a.client.post("/api/account/email/request", {
    newEmail: `hijack.${a.user.email}`,
    currentPassword: a.user.password,
    userId: 2,
    email: b.user.email,
  });
  assert.equal(r.status, 200);
  const code = lastCode(ctx.EmailAdapter, `hijack.${a.user.email}`);
  await a.client.post("/api/account/email/confirm", { code, userId: 2 });
  const rowB = (await ctx.pool.query("SELECT email FROM users WHERE login=$1", [b.user.login])).rows[0];
  assert.equal(rowB.email, b.user.email, "аккаунт B не затронут");
});

// ── Удаление аккаунта ────────────────────────────────────────────────────
test("удаление аккаунта: неверный пароль → 400, аккаунт жив; верный → удалён, сессии завершены", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const other = ctx.newClient();
  await other.post("/api/auth/login", { email: user.email, password: user.password });

  const wrong = await client.post("/api/account/delete", { currentPassword: "Wrong_Password1" });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.body.error.code, "CURRENT_PASSWORD_WRONG");
  assert.equal((await client.get("/api/auth/me")).status, 200);

  const empty = await client.post("/api/account/delete", {});
  assert.equal(empty.status, 400);

  const ok = await client.post("/api/account/delete", { currentPassword: user.password });
  assert.equal(ok.status, 200);
  assert.equal(client.cookie("ac_sid"), undefined, "cookie сессии очищена");

  const rows = (await ctx.pool.query("SELECT 1 FROM users WHERE email=$1", [user.email])).rows;
  assert.equal(rows.length, 0, "запись удалена из БД");
  assert.equal((await client.get("/api/auth/me")).status, 401);
  assert.equal((await other.get("/api/auth/me")).status, 401, "другая сессия завершена");

  const fresh = ctx.newClient();
  assert.equal((await fresh.post("/api/auth/login", { email: user.email, password: user.password })).status, 401);
});

test("удаление аккаунта требует авторизации", async () => {
  const anon = ctx.newClient();
  const res = await anon.post("/api/account/delete", { currentPassword: VALID_PASSWORD });
  assert.equal(res.status, 401);
});
