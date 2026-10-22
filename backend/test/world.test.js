import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, registerAndLogin } from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup();
});
after(async () => ctx.teardown());

const { riskBand, effectiveIndex, START_CITY_CODE } = await import("../src/constants/world.constants.js");
const { WorldService } = await import("../src/services/world.service.js");

/** Выполняет сценарий в транзакции и откатывает: тесты не меняют данные мира. */
async function rolledBack(fn) {
  const client = await ctx.pool.connect();
  try {
    await client.query("BEGIN");
    await fn(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}
const one = async (c, sql, params) => (await c.query(sql, params)).rows[0];

test("все проверки целостности мира проходят", async () => {
  const { rows } = await ctx.pool.query("SELECT * FROM world_integrity_report()");
  assert.ok(rows.length >= 20);
  const failed = rows.filter((r) => !r.ok);
  assert.deepEqual(failed, []);
});

test("20 постоянных городов, 3 города событий, по 4 локации, уровни 1…50", async () => {
  const { rows } = await ctx.pool.query(
    "SELECT kind, count(*)::int AS n, min(unlock_level) AS lo, max(unlock_level) AS hi FROM cities GROUP BY kind ORDER BY kind",
  );
  assert.deepEqual(rows.map((r) => [r.kind, r.n]), [["event", 3], ["permanent", 20]]);
  const permanent = rows.find((r) => r.kind === "permanent");
  assert.equal(permanent.lo, 1);
  assert.equal(permanent.hi, 50);
  const per = await ctx.pool.query("SELECT DISTINCT n FROM (SELECT count(*)::int AS n FROM locations GROUP BY city_id) t");
  assert.deepEqual(per.rows, [{ n: 4 }]);
});

test("регионов нет ни в таблицах, ни в колонках", async () => {
  const { rows } = await ctx.pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%region%' OR table_name ILIKE '%region%')`,
  );
  assert.equal(rows.length, 0);
});

test("новый персонаж начинает в «Верхнем Эльдране»", async () => {
  const { user } = await registerAndLogin(ctx);
  const row = await one(
    ctx.pool,
    "SELECT c.code, c.name, c.unlock_level FROM users u JOIN cities c ON c.id = u.current_city_id WHERE lower(u.email) = lower($1)",
    [user.email],
  );
  assert.deepEqual(row, { code: START_CITY_CODE, name: "Верхний Эльдран", unlock_level: 1 });
});

test("города событий называются по заданию", async () => {
  const { rows } = await ctx.pool.query("SELECT name FROM cities WHERE kind = 'event' ORDER BY id");
  assert.deepEqual(rows.map((r) => r.name), ["Вербный Град", "Город Двенадцати Огней", "Город Первой Короны"]);
});

test("БД не принимает неверные коды, уровни и риск", async () => {
  await rolledBack(async (c) => {
    const bad = async (sql, params) => {
      await c.query("SAVEPOINT s");
      await assert.rejects(c.query(sql, params));
      await c.query("ROLLBACK TO s");
    };
    await bad("UPDATE locations SET risk_coefficient = 1.01 WHERE id = 1");
    await bad("UPDATE locations SET risk_coefficient = -0.01 WHERE id = 1");
    await bad("UPDATE cities SET unlock_level = 51 WHERE id = 2");
    await bad("UPDATE cities SET unlock_level = 0 WHERE id = 2");
    await bad("UPDATE locations SET unlock_level = 51 WHERE id = 1");
    await bad("UPDATE cities SET code = 'upper_eldran' WHERE id = 2");
    await bad("UPDATE locations SET code = (SELECT code FROM locations WHERE id = 1) WHERE id = 2");
    await bad("INSERT INTO locations (city_id, code, name, sort_order, unlock_level) VALUES (999, 'x_loc', 'X', 1, 1)");
    await bad("UPDATE world_events SET timezone = 'Nowhere/Land' WHERE id = 1");
    await bad("UPDATE world_events SET starts_at = now(), ends_at = now() - interval '1 hour' WHERE id = 1");
    await bad("UPDATE cities SET is_start = TRUE WHERE id = 2");
  });
});

test("риск локации собственный: меняется без влияния на город и другие локации", async () => {
  await rolledBack(async (c) => {
    const before = await one(c, "SELECT risk_coefficient::float8 AS r FROM locations WHERE id = 2");
    await c.query("UPDATE locations SET risk_coefficient = 0.40 WHERE id = 1");
    const after = await one(c, "SELECT risk_coefficient::float8 AS r FROM locations WHERE id = 2");
    assert.equal(after.r, before.r);
  });
  const { rows } = await ctx.pool.query("SELECT DISTINCT risk_coefficient::float8 AS r FROM locations ORDER BY 1");
  assert.ok(rows.every((x) => x.r >= 0 && x.r <= 0.4));
});

test("шкала риска и индекс P_effective = P_base · (1 + risk)", () => {
  assert.equal(riskBand(0), "none");
  assert.equal(riskBand(0.05), "low");
  assert.equal(riskBand(0.1), "moderate");
  assert.equal(riskBand(0.15), "high");
  assert.equal(riskBand(0.2), "high");
  assert.equal(riskBand(0.25), "very_high");
  assert.equal(riskBand(0.3), "very_high");
  assert.equal(riskBand(0.35), "critical");
  assert.equal(riskBand(0.4), "critical");
  assert.throws(() => riskBand(1.5), RangeError);
  assert.throws(() => riskBand(-0.1), RangeError);
  assert.equal(effectiveIndex(100, 0), 100);
  assert.ok(Math.abs(effectiveIndex(100, 0.25) - 125) < 1e-9);
});

test("в город нельзя войти раньше нужного уровня", async () => {
  const cities = await WorldService.listCities(1);
  const permanent = cities.filter((c) => c.kind === "permanent");
  for (const city of permanent) {
    assert.equal(await WorldService.canAccessCity(city.id, city.unlock_level - 1), false, city.code);
    assert.equal(await WorldService.canAccessCity(city.id, city.unlock_level), true, city.code);
  }
  assert.deepEqual(permanent.filter((c) => c.accessible).map((c) => c.code), ["upper_eldran"]);
});

test("уровень локации задаётся отдельно от города", async () => {
  const loc = await one(
    ctx.pool,
    `SELECT l.id, l.unlock_level, c.unlock_level AS city_level FROM locations l JOIN cities c ON c.id = l.city_id
      WHERE l.unlock_level > c.unlock_level AND c.kind = 'permanent' ORDER BY l.id LIMIT 1`,
  );
  assert.ok(loc);
  assert.equal(await WorldService.canAccessLocation(loc.id, loc.city_level), false);
  assert.equal(await WorldService.canAccessLocation(loc.id, loc.unlock_level), true);
  await rolledBack(async (c) => {
    await c.query("UPDATE locations SET required_quest_code = 'quest_x' WHERE id = $1", [loc.id]);
    const q = (quests) => one(c, "SELECT world_location_access($1::smallint, 50, NOW(), $2::text[]) AS ok", [loc.id, quests]);
    assert.equal((await q([])).ok, false);
    assert.equal((await q(["quest_x"])).ok, true);
  });
});

test("событие: открытие, закрытие, история; город остаётся в БД", async () => {
  await rolledBack(async (c) => {
    const city = await one(c, "SELECT id FROM cities WHERE code = 'verbny_grad'");
    const access = async (level) => (await one(c, "SELECT world_city_access($1::smallint, $2) AS ok", [city.id, level])).ok;

    // даты не заданы — город закрыт при любом уровне
    assert.equal(await access(50), false);

    await c.query("SELECT world_event_schedule(1::smallint, NOW() - interval '1 hour', NOW() + interval '1 hour', 'Europe/Kyiv')");
    assert.equal(await access(50), true);
    assert.equal(await access(4), false, "min_level события");
    assert.deepEqual(await one(c, "SELECT * FROM world_events_sync()"), { opened: 1, closed: 0 });
    assert.deepEqual(await one(c, "SELECT * FROM world_events_sync()"), { opened: 0, closed: 0 }, "идемпотентность");
    assert.equal((await one(c, "SELECT status FROM world_events WHERE id = 1")).status, "active");

    // активное событие нельзя перенести
    await c.query("SAVEPOINT s");
    await assert.rejects(c.query("SELECT world_event_schedule(1::smallint, NOW(), NOW() + interval '1 day')"));
    await c.query("ROLLBACK TO s");

    // окно закончилось: доступ закрыт даже до синхронизации
    const later = "NOW() + interval '2 hours'";
    assert.equal((await one(c, `SELECT world_city_access($1::smallint, 50, ${later}) AS ok`, [city.id])).ok, false);
    assert.deepEqual(await one(c, `SELECT * FROM world_events_sync(${later})`), { opened: 0, closed: 1 });

    const run = await one(c, "SELECT status, closed_at IS NOT NULL AS closed, timezone FROM world_event_runs WHERE world_event_id = 1");
    assert.deepEqual(run, { status: "finished", closed: true, timezone: "Europe/Kyiv" });

    // город и локации не удалены; прямое удаление запрещено
    assert.equal((await one(c, "SELECT count(*)::int AS n FROM cities WHERE kind = 'event'")).n, 3);
    assert.equal((await one(c, "SELECT count(*)::int AS n FROM locations WHERE city_id = $1", [city.id])).n, 4);
    for (const sql of ["DELETE FROM cities WHERE id = $1", "DELETE FROM locations WHERE city_id = $1", "DELETE FROM world_events WHERE id = 1"]) {
      await c.query("SAVEPOINT d");
      await assert.rejects(c.query(sql, sql.includes("world_events") ? [] : [city.id]));
      await c.query("ROLLBACK TO d");
    }

    // повторный запуск: новая запись истории
    await c.query("SELECT world_event_schedule(1::smallint, NOW() - interval '1 minute', NOW() + interval '1 day')");
    await c.query("SELECT * FROM world_events_sync()");
    assert.equal((await one(c, "SELECT count(*)::int AS n FROM world_event_runs WHERE world_event_id = 1")).n, 2);

    const failed = (await c.query("SELECT * FROM world_integrity_report() WHERE NOT ok")).rows;
    assert.deepEqual(failed, []);
  });
});

test("отмена события закрывает город, но не удаляет его", async () => {
  await rolledBack(async (c) => {
    await c.query("SELECT world_event_schedule(2::smallint, NOW() - interval '1 hour', NOW() + interval '1 hour')");
    await c.query("UPDATE world_events SET status = 'cancelled' WHERE id = 2");
    const city = await one(c, "SELECT id FROM cities WHERE code = 'twelve_lights'");
    assert.equal((await one(c, "SELECT world_city_access($1::smallint, 50) AS ok", [city.id])).ok, false);
    assert.equal((await one(c, "SELECT count(*)::int AS n FROM cities WHERE id = $1", [city.id])).n, 1);
  });
});

test("WorldService.syncEvents работает без событий", async () => {
  assert.deepEqual(await WorldService.syncEvents(), { opened: 0, closed: 0 });
});

// ── HTTP API ────────────────────────────────────────────────────────────
const setLevel = (user, level) =>
  ctx.pool.query("UPDATE users SET level = $2 WHERE lower(email) = lower($1)", [user.email, level]);
const cityByCode = async (code) => (await one(ctx.pool, "SELECT id FROM cities WHERE code = $1", [code])).id;

test("API мира требует авторизации", async () => {
  const anon = ctx.newClient();
  assert.equal((await anon.get("/api/world")).status, 401);
  assert.equal((await anon.get("/api/world/cities/1")).status, 401);
});

test("GET /api/world: 23 города, открыт только стартовый, текущий отмечен", async () => {
  const { client } = await registerAndLogin(ctx);
  const res = await client.get("/api/world");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Number.isFinite(Date.parse(res.body.serverTime)));
  const { cities, currentCityId } = res.body;
  assert.equal(cities.length, 23);
  assert.equal(cities.filter((c) => c.kind === "permanent").length, 20);

  const start = cities.find((c) => c.code === START_CITY_CODE);
  assert.equal(currentCityId, start.id);
  assert.equal(start.isCurrent, true);
  assert.equal(cities.filter((c) => c.isCurrent).length, 1);
  assert.deepEqual(cities.filter((c) => c.accessible).map((c) => c.code), [START_CITY_CODE]);
  assert.equal(start.requiredLevel, 1);
  // постоянные города идут по возрастанию уровня, города событий — в конце
  const perm = cities.filter((c) => c.kind === "permanent").map((c) => c.requiredLevel);
  assert.deepEqual(perm, [...perm].sort((a, b) => a - b));
  assert.deepEqual(cities.slice(-3).map((c) => c.kind), ["event", "event", "event"]);
  // внутренние поля не утекают
  assert.ok(!("risk_coefficient" in start) && !("unlock_level" in start) && !("world_event_id" in start));
});

test("города событий без дат: закрыты, состояние unscheduled, дат нет", async () => {
  const { client } = await registerAndLogin(ctx);
  const { cities } = (await client.get("/api/world")).body;
  for (const c of cities.filter((x) => x.kind === "event")) {
    assert.equal(c.accessible, false);
    assert.deepEqual(c.event, { state: "unscheduled", startsAt: null, endsAt: null, timezone: "UTC" });
  }
});

test("GET /api/world/cities/:id: локации стартового города, риск словесный", async () => {
  const { client } = await registerAndLogin(ctx);
  const id = await cityByCode(START_CITY_CODE);
  const res = await client.get(`/api/world/cities/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.city.code, START_CITY_CODE);
  const locs = res.body.locations;
  assert.deepEqual(locs.map((l) => l.name), ["Рыночная площадь", "Зал гильдий", "Старая стена", "Подвалы под площадью"]);
  assert.deepEqual(locs.map((l) => l.risk), ["none", "none", "low", "moderate"]);
  assert.ok(locs.every((l) => l.accessible && l.requiredLevel === 1 && l.requiresQuest === false));
  assert.ok(locs.every((l) => !("risk_coefficient" in l) && !("riskCoefficient" in l) && !("city_id" in l)));
});

test("закрытый по уровню город не раскрывает локации; с нужным уровнем открывается", async () => {
  const { client, user } = await registerAndLogin(ctx);
  const id = await cityByCode("lower_eldran"); // уровень 3
  const denied = await client.get(`/api/world/cities/${id}`);
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "CITY_LOCKED");
  assert.equal(denied.body.locations, undefined);

  await setLevel(user, 3);
  const ok = await client.get(`/api/world/cities/${id}`);
  assert.equal(ok.status, 200);
  // «Нижние стоки» — риск 0.15, уровень локации выше уровня города
  const sewers = ok.body.locations.find((l) => l.code === "lower_eldran_lower_sewers");
  assert.equal(sewers.risk, "high");
  assert.equal(sewers.requiredLevel, 5);
  assert.equal(sewers.accessible, false);
  assert.equal(ok.body.locations.filter((l) => l.accessible).length, 3);

  const map = (await client.get("/api/world")).body.cities;
  assert.deepEqual(map.filter((c) => c.accessible).map((c) => c.code), [START_CITY_CODE, "lower_eldran"]);
});

test("неверный и неизвестный id города", async () => {
  const { client } = await registerAndLogin(ctx);
  for (const bad of ["abc", "0", "-1", "1.5", "99999", "1e2"]) {
    const res = await client.get(`/api/world/cities/${bad}`);
    assert.equal(res.status, 400, bad);
  }
  const res = await client.get("/api/world/cities/9999");
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "CITY_NOT_FOUND");
});

test("город события открывается и закрывается по календарю, остаётся в списке", async () => {
  const { client, user } = await registerAndLogin(ctx);
  await setLevel(user, 50);
  const id = await cityByCode("verbny_grad");
  try {
    await ctx.pool.query(
      "SELECT world_event_schedule(1::smallint, NOW() - interval '1 hour', NOW() + interval '1 hour', 'Europe/Kyiv')",
    );
    const open = (await client.get("/api/world")).body.cities.find((c) => c.id === id);
    assert.equal(open.accessible, true);
    assert.equal(open.event.state, "open");
    assert.equal(open.event.timezone, "Europe/Kyiv");
    assert.ok(Date.parse(open.event.endsAt) > Date.now());
    assert.equal((await client.get(`/api/world/cities/${id}`)).body.locations.length, 4);

    // будущее событие: виден «upcoming», вход закрыт
    await ctx.pool.query("UPDATE world_events SET starts_at = NOW() + interval '1 day', ends_at = NOW() + interval '2 days' WHERE id = 1");
    const upcoming = (await client.get("/api/world")).body.cities.find((c) => c.id === id);
    assert.equal(upcoming.event.state, "upcoming");
    assert.equal(upcoming.accessible, false);
    assert.equal((await client.get(`/api/world/cities/${id}`)).status, 403);

    // событие закончилось: город всё ещё в списке, доступа нет
    await ctx.pool.query("UPDATE world_events SET starts_at = NOW() - interval '2 days', ends_at = NOW() - interval '1 day' WHERE id = 1");
    const ended = (await client.get("/api/world")).body.cities.find((c) => c.id === id);
    assert.equal(ended.event.state, "closed");
    assert.equal(ended.accessible, false);
  } finally {
    await ctx.pool.query(
      "UPDATE world_events SET status = 'unscheduled', starts_at = NULL, ends_at = NULL, timezone = 'UTC' WHERE id = 1",
    );
  }
});
