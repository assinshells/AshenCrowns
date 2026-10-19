import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, uniqueUser } from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup({
    RATE_LIMIT_LOGIN_MAX: "3",
    RATE_LIMIT_REGISTER_MAX: "2",
    RATE_LIMIT_FORGOT_MAX: "2",
    RATE_LIMIT_OTP_MAX: "3",
  });
});
after(async () => ctx.teardown());

test("rate-limit: login — 429 после лимита запросов с одного IP", async () => {
  const c = ctx.newClient();
  const statuses = [];
  for (let i = 0; i < 5; i++) {
    statuses.push((await c.post("/api/auth/login", { email: `x${i}@example.com`, password: "Wrong_Password1" })).status);
  }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429]);
  const r = await c.post("/api/auth/login", { email: "y@example.com", password: "Wrong_Password1" });
  assert.equal(r.body.error.code, "RATE_LIMIT_EXCEEDED");
});

test("rate-limit: register", async () => {
  const c = ctx.newClient();
  const s = [];
  for (let i = 0; i < 4; i++) s.push((await c.post("/api/auth/register", { ...uniqueUser(), confirmPassword: "x" })).status);
  assert.deepEqual(s, [400, 400, 429, 429]);
});

test("rate-limit: verify-otp — перебор кода ограничен и по IP", async () => {
  const c = ctx.newClient();
  const s = [];
  for (let i = 0; i < 5; i++) s.push((await c.post("/api/auth/verify-otp", { email: "a@example.com", code: "123456", purpose: "verify_email" })).status);
  assert.deepEqual(s, [400, 400, 400, 429, 429]);
});

test("rate-limit: forgot-password", async () => {
  const c = ctx.newClient();
  const s = [];
  for (let i = 0; i < 4; i++) {
    await ctx.clearCooldowns();
    s.push((await c.post("/api/auth/forgot-password", { email: `f${i}@example.com` })).status);
  }
  assert.deepEqual(s, [200, 200, 429, 429]);
});

test("счётчики rate-limit лежат в Redis (переживают рестарт)", async () => {
  const keys = await ctx.redisClient.keys("rl:*");
  assert.ok(keys.length > 0);
});
