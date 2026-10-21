import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, registerAndLogin } from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup();
});
after(async () => ctx.teardown());

const start = (client, kind, hours) => client.post("/api/work/start", { kind, hours });
const state = (client) => client.get("/api/work");
const claim = (client) => client.post("/api/work/claim", {});
const me = async (client) => (await client.get("/api/auth/me")).body.user.stats;

const byEmail = "user_id = (SELECT id FROM users WHERE lower(email) = lower($1))";
/** Сдвигает конец активной работы (ждать часы в тесте нельзя). */
const finishNow = (user) =>
  ctx.pool.query(
    `UPDATE work_sessions SET ends_at = NOW() - interval '1 second' WHERE status = 'active' AND ${byEmail}`,
    [user.email],
  );
const finishIn = (user, seconds) =>
  ctx.pool.query(
    `UPDATE work_sessions SET ends_at = NOW() + make_interval(secs => $2) WHERE status = 'active' AND ${byEmail}`,
    [user.email, seconds],
  );
const setKarma = (user, karma) =>
  ctx.pool.query("UPDATE users SET karma = $2 WHERE lower(email) = lower($1)", [user.email, karma]);

test("работы требуют авторизации", async () => {
  const anon = ctx.newClient();
  assert.equal((await state(anon)).status, 401);
  assert.equal((await start(anon, "gate", 1)).status, 401);
  assert.equal((await anon.post("/api/work/cancel", {})).status, 401);
  assert.equal((await claim(anon)).status, 401);
});

test("каталог наград: серебро и карма на 1–8 часов", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await state(client);
  assert.equal(res.status, 200);
  assert.equal(res.body.active, null);
  const jobs = Object.fromEntries(res.body.jobs.map((j) => [j.key, j]));

  const col = (job, field) => job.rewards.map((r) => r[field]);
  assert.deepEqual(col(jobs.gate, "silver"), [2, 4, 6, 8, 10, 12, 14, 17]);
  assert.deepEqual(col(jobs.robbery, "silver"), [2, 4, 6, 8, 10, 12, 14, 17]);
  assert.deepEqual(col(jobs.field, "silver"), [2, 4, 7, 9, 11, 14, 16, 19]);
  assert.deepEqual(col(jobs.gate, "karma"), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(col(jobs.robbery, "karma"), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(col(jobs.field, "karma"), [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(col(jobs.gate, "hours"), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(jobs.gate.karma, "light");
  assert.equal(jobs.robbery.karma, "dark");
  assert.equal(jobs.field.karma, null);
});

test("взять работу: награда фиксируется на сервере, серебро не зачислено", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await start(client, "gate", 8);
  assert.equal(res.status, 200);
  assert.equal(res.body.active.kind, "gate");
  assert.equal(res.body.active.hours, 8);
  assert.equal(res.body.active.silver, 17);
  assert.equal(res.body.active.karma, 4);
  assert.equal(res.body.active.status, "active");
  assert.equal(res.body.active.finished, false);

  const ms = Date.parse(res.body.active.endsAt) - Date.parse(res.body.active.startedAt);
  assert.equal(ms, 8 * 3600 * 1000);

  const s = await state(client);
  assert.equal(s.body.active.id, res.body.active.id);
  assert.equal(s.body.active.finished, false);
  assert.ok(Date.parse(s.body.serverTime) < Date.parse(s.body.active.endsAt));
  assert.equal((await me(client)).silver, 200);
});

test("пока работа идёт, взять вторую нельзя (409), в том числе параллельно", async () => {
  const { client } = await registerAndLogin(ctx);
  const results = await Promise.all([start(client, "gate", 1), start(client, "field", 2)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.ok(results.some((r) => r.body.error?.code === "ALREADY_WORKING"));
  assert.equal((await start(client, "robbery", 3)).status, 409);
});

test("клиент не задаёт награду: серебро и карма из тела запроса игнорируются", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.post("/api/work/start", { kind: "field", hours: 3, silver: 99999, karma: 99 });
  assert.equal(res.status, 200);
  assert.equal(res.body.active.silver, 7);
  assert.equal(res.body.active.karma, 0);
});

test("некорректные вид работы и часы отклоняются (400)", async () => {
  const { client } = await registerAndLogin(ctx);
  const bad = [["fight", 1], ["", 1], [null, 1], ["gate", 0], ["gate", 9], ["gate", 1.5], ["gate", "2"], ["gate", null], ["gate", -1]];
  for (const [kind, hours] of bad) {
    assert.equal((await start(client, kind, hours)).status, 400, JSON.stringify([kind, hours]));
  }
  assert.equal((await client.post("/api/work/start", {})).status, 400);
  assert.equal((await state(client)).body.active, null);
});

test("время вышло: работа помечена завершённой, но серебро НЕ зачислено без «Принять оплату»", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "gate", 8);
  await finishNow(user);

  const s = await state(client);
  assert.equal(s.body.active.finished, true);
  assert.equal(s.body.active.status, "active");
  const stats = await me(client);
  assert.equal(stats.silver, 200);
  assert.deepEqual(stats.karma, { light: 0, dark: 0 });
});

test("«Принять оплату»: серебро и светлая карма зачислены, работа закрыта", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "gate", 8);
  await finishNow(user);

  const res = await claim(client);
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.silver, 217);
  assert.deepEqual(res.body.stats.karma, { light: 4, dark: 0 });

  const stats = await me(client);
  assert.equal(stats.silver, 217);
  assert.equal((await state(client)).body.active, null);
  // можно брать следующую
  assert.equal((await start(client, "field", 1)).status, 200);
});

test("до окончания времени оплату принять нельзя (409), ничего не зачисляется", async () => {
  const { client } = await registerAndLogin(ctx);
  await start(client, "gate", 8);
  const res = await claim(client);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "NOTHING_TO_CLAIM");
  assert.equal((await me(client)).silver, 200);
  assert.equal((await state(client)).body.active.finished, false);
});

test("без работы принимать нечего (409)", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await claim(client);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "NOTHING_TO_CLAIM");
});

test("оплата принимается один раз, даже при параллельных запросах", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "gate", 8);
  await finishNow(user);

  const results = await Promise.all(Array.from({ length: 8 }, () => claim(client)));
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 7);
  const stats = await me(client);
  assert.equal(stats.silver, 217);
  assert.deepEqual(stats.karma, { light: 4, dark: 0 });

  assert.equal((await claim(client)).status, 409);
  assert.equal((await me(client)).silver, 217);
});

test("нейтральная работа: больше серебра, карма не меняется", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "field", 8);
  await finishNow(user);
  const res = await claim(client);
  assert.equal(res.body.stats.silver, 200 + 19);
  assert.deepEqual(res.body.stats.karma, { light: 0, dark: 0 });
});

test("грабёж даёт тёмную карму", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "robbery", 3);
  await finishNow(user);
  const res = await claim(client);
  assert.equal(res.body.stats.silver, 200 + 6);
  assert.deepEqual(res.body.stats.karma, { light: 0, dark: 2 });
});

test("карма противоположного цвета гасит накопленную, в минус не считается", async () => {
  const { client, user } = await registerAndLogin(ctx);

  // Было 10 тёмной, получено 4 светлой → тёмная 6, светлая 0.
  await setKarma(user, -10);
  await start(client, "gate", 8);
  await finishNow(user);
  assert.deepEqual((await claim(client)).body.stats.karma, { light: 0, dark: 6 });

  // Было 3 светлой, получено 4 тёмной → светлая 0, тёмная 1.
  await setKarma(user, 3);
  await start(client, "robbery", 8);
  await finishNow(user);
  assert.deepEqual((await claim(client)).body.stats.karma, { light: 0, dark: 1 });

  // Тёмная 1 + светлая 4 → светлая 3.
  await start(client, "gate", 8);
  await finishNow(user);
  assert.deepEqual((await claim(client)).body.stats.karma, { light: 3, dark: 0 });
});

test("отмена: ничего не зачисляется, можно взять новую работу", async () => {
  const { client } = await registerAndLogin(ctx);
  await start(client, "gate", 8);

  const res = await client.post("/api/work/cancel", {});
  assert.equal(res.status, 200);
  assert.equal(res.body.cancelled, true);

  const stats = await me(client);
  assert.equal(stats.silver, 200);
  assert.deepEqual(stats.karma, { light: 0, dark: 0 });
  assert.equal((await state(client)).body.active, null);
  assert.equal((await claim(client)).status, 409);
  assert.equal((await start(client, "field", 1)).status, 200);
});

test("отмена без работы: cancelled=false", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.post("/api/work/cancel", {});
  assert.equal(res.status, 200);
  assert.equal(res.body.cancelled, false);
});

test("после окончания времени отменить нельзя: награда остаётся за игроком", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "gate", 2);
  await finishNow(user);

  const res = await client.post("/api/work/cancel", {});
  assert.equal(res.body.cancelled, false);
  const claimed = await claim(client);
  assert.equal(claimed.body.stats.silver, 204);
  assert.deepEqual(claimed.body.stats.karma, { light: 1, dark: 0 });
});

test("тест-сценарий: конец через 10 секунд → сначала идёт, затем ждёт оплаты", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await start(client, "gate", 1);
  await finishIn(user, 1);

  assert.equal((await state(client)).body.active.finished, false);
  await new Promise((r) => setTimeout(r, 1300));
  assert.equal((await state(client)).body.active.finished, true);
  assert.equal((await claim(client)).status, 200);
});

test("принять оплату и взять работу требуют CSRF-токен", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.post("/api/work/start", { kind: "gate", hours: 1 }, { csrf: false });
  assert.equal(res.status, 403);
  assert.equal((await client.post("/api/work/claim", {}, { csrf: false })).status, 403);
});

test("опыт до следующего уровня: 5 · уровень² (1→5, 2→20, 3→45, 4→80, 5→125, 20→2000, 30→4500)", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const expected = { 1: 5, 2: 20, 3: 45, 4: 80, 5: 125, 20: 2000, 30: 4500 };
  for (const [level, need] of Object.entries(expected)) {
    await ctx.pool.query("UPDATE users SET level = $2 WHERE lower(email) = lower($1)", [user.email, Number(level)]);
    const stats = await me(client);
    assert.equal(stats.level, Number(level));
    assert.equal(stats.experienceToNext, need, `уровень ${level}`);
  }
});
