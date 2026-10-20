import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, registerAndLogin } from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup();
});
after(async () => ctx.teardown());

const upgrade = (client, attribute) =>
  client.post("/api/character/attributes/upgrade", { attribute });

test("повышение требует авторизации", async () => {
  const anon = ctx.newClient();
  const res = await upgrade(anon, "strength");
  assert.equal(res.status, 401);
});

test("повышение силы: цена — квадрат нового значения, серебро списывается", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await upgrade(client, "strength");
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.attributes.strength, 4);
  assert.equal(res.body.stats.silver, 200 - 16);

  const me = (await client.get("/api/auth/me")).body.user;
  assert.equal(me.stats.attributes.strength, 4, "значение сохранено в БД");
  assert.equal(me.stats.silver, 184);
});

test("каждая характеристика повышается отдельно", async () => {
  const { client } = await registerAndLogin(ctx);
  for (const key of ["giftedness", "luck", "attack", "defense"]) {
    const res = await upgrade(client, key);
    assert.equal(res.status, 200, key);
    assert.equal(res.body.stats.attributes[key], 4, key);
  }
  const { attributes } = (await client.get("/api/auth/me")).body.user.stats;
  assert.equal(attributes.strength, 3);
  assert.equal(attributes.constitution, 3);
});

test("телосложение поднимает максимум и текущее здоровье на 25", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await upgrade(client, "constitution");
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.attributes.constitution, 4);
  assert.equal(res.body.stats.maxHealth, 100);
  assert.equal(res.body.stats.health, 100);
});

test("последовательные повышения списывают 16, 25, 36…", async () => {
  const { client } = await registerAndLogin(ctx);
  let silver = 200;
  for (const next of [4, 5, 6]) {
    const res = await upgrade(client, "strength");
    assert.equal(res.status, 200);
    silver -= next * next;
    assert.equal(res.body.stats.silver, silver);
  }
});

test("не хватает серебра: 409, ничего не меняется", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await ctx.pool.query("UPDATE users SET silver = 15 WHERE lower(email) = lower($1)", [user.email]);

  const res = await upgrade(client, "strength");
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "INSUFFICIENT_SILVER");

  const { stats } = (await client.get("/api/auth/me")).body.user;
  assert.equal(stats.silver, 15);
  assert.equal(stats.attributes.strength, 3);
});

test("ровно хватает серебра: баланс становится 0", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await ctx.pool.query("UPDATE users SET silver = 16 WHERE lower(email) = lower($1)", [user.email]);
  const res = await upgrade(client, "luck");
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.silver, 0);
});

test("параллельные запросы не уводят серебро в минус", async () => {
  const { client, user } = await registerAndLogin(ctx);
  // Хватает на одно повышение силы (16), на второе (25) — нет.
  await ctx.pool.query("UPDATE users SET silver = 30 WHERE lower(email) = lower($1)", [user.email]);

  const results = await Promise.all([upgrade(client, "strength"), upgrade(client, "strength")]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);

  const { stats } = (await client.get("/api/auth/me")).body.user;
  assert.equal(stats.attributes.strength, 4);
  assert.equal(stats.silver, 14);
});

test("неизвестная характеристика и мусор в теле отклоняются (400)", async () => {
  const { client } = await registerAndLogin(ctx);
  for (const attribute of ["hp", "silver", "attack_skill", "", 5, null, {}, ["strength"]]) {
    const res = await upgrade(client, attribute);
    assert.equal(res.status, 400, JSON.stringify(attribute));
  }
  const empty = await client.post("/api/character/attributes/upgrade", {});
  assert.equal(empty.status, 400);
});

test("цена и значения из тела запроса игнорируются", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.post("/api/character/attributes/upgrade", {
    attribute: "strength",
    cost: 0,
    value: 100,
    silver: 99999,
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.stats.attributes.strength, 4);
  assert.equal(res.body.stats.silver, 184);
});

test("повышение требует CSRF-токен", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.post(
    "/api/character/attributes/upgrade",
    { attribute: "strength" },
    { csrf: false },
  );
  assert.equal(res.status, 403);
});
