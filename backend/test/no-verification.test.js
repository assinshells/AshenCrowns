import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { setup, uniqueUser, register } from "./helpers.js";

let ctx;
before(async () => {
  ctx = await setup({ EMAIL_VERIFICATION_REQUIRED: "false" });
});
after(async () => ctx.teardown());

test("EMAIL_VERIFICATION_REQUIRED=false: письмо не отправляется, вход сразу возможен, сессия при регистрации всё равно не создаётся", async () => {
  const c = ctx.newClient();
  const u = uniqueUser();
  const res = await register(ctx, c, u);
  assert.equal(res.status, 201);
  assert.equal(res.body.requiresEmailVerification, false);
  assert.equal(c.cookie("ac_sid"), undefined);
  assert.equal(ctx.EmailAdapter.outbox.length, 0);

  const login = await c.post("/api/auth/login", { email: u.email, password: u.password });
  assert.equal(login.status, 200);
});
