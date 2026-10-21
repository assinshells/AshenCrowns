import test from "node:test";
import assert from "node:assert/strict";

process.env.OTP_SECRET = "x".repeat(40);
process.env.CLIENT_URL = "http://localhost:5173";
process.env.NODE_ENV = "test";

const { passwordErrors, loginErrors, isValidEmail } = await import(
  "../src/validators/auth.validator.js"
);
const { maskEmail, normalizeEmail } = await import("../src/utils/email.util.js");
const { PasswordProvider } = await import("../src/providers/password.provider.js");
const { OtpProvider } = await import("../src/providers/otp.provider.js");

test("password policy", () => {
  assert.deepEqual(passwordErrors("Str0ngPassword_1"), []);
  assert.deepEqual(passwordErrors("Надёжный_Пароль1"), []); // кириллица допустима
  assert.ok(passwordErrors("Short1A").length, "слишком короткий");
  assert.ok(passwordErrors("alllowercase1234").length, "нет заглавной");
  assert.ok(passwordErrors("ALLUPPERCASE1234").length, "нет строчной");
  assert.ok(passwordErrors("NoDigitsHereAtAll").length, "нет цифры");
  assert.ok(passwordErrors("Has Space Inside1A").length, "пробел запрещён");
  assert.ok(passwordErrors("A1" + "a".repeat(80)).length, "слишком длинный");
  assert.ok(passwordErrors({ $ne: 1 }).length, "не строка");
  assert.ok(passwordErrors(undefined).length);
});

test("login policy: латиница/кириллица/цифры/_ до 20 символов", () => {
  for (const ok of ["abc", "Игрок_1", "_start", "end_", "mid_dle", "a".repeat(20)]) {
    assert.deepEqual(loginErrors(ok), [], ok);
  }
  for (const bad of ["ab", "a".repeat(21), "has space", "dash-name", "dot.name", "emoji😀", "a@b", ""]) {
    assert.ok(loginErrors(bad).length, bad);
  }
  assert.ok(loginErrors(["array"]).length);
});

test("email validation + normalization", () => {
  assert.ok(isValidEmail("a.b+c@example.com"));
  for (const bad of ["", "a", "a@b", "a@b.c", "a b@example.com", "@example.com", 5, null]) {
    assert.ok(!isValidEmail(bad), String(bad));
  }
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
});

test("maskEmail скрывает адрес частично", () => {
  assert.equal(maskEmail("john.doe@gmail.com"), "j***e@g***l.com");
  assert.equal(maskEmail("ab@x.io"), "a***@x***.io");
  assert.equal(maskEmail("JOHN@Mail.Example.org"), "j***n@m***l.example.org");
  assert.ok(!maskEmail("john.doe@gmail.com").includes("john"));
  assert.equal(maskEmail("garbage"), "***");
});

test("password hashing: scrypt, соль, верификация, формат", async () => {
  const h1 = await PasswordProvider.hash("Str0ngPassword_1");
  const h2 = await PasswordProvider.hash("Str0ngPassword_1");
  assert.match(h1, /^scrypt\$32768\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.notEqual(h1, h2, "соль уникальна");
  assert.equal(await PasswordProvider.verify("Str0ngPassword_1", h1), true);
  assert.equal(await PasswordProvider.verify("wrong", h1), false);
  assert.equal(await PasswordProvider.verify("x", "garbage"), false);
  assert.equal(await PasswordProvider.verify("x", undefined), false);
});

test("OTP: 6 цифр, HMAC привязан к сценарию и субъекту", () => {
  for (let i = 0; i < 200; i++) assert.match(OtpProvider.generate(), /^\d{6}$/);
  const h = OtpProvider.hash("verify_email", "a@b.com", "123456");
  assert.ok(OtpProvider.safeEqualHex(h, OtpProvider.hash("verify_email", "a@b.com", "123456")));
  assert.ok(!OtpProvider.safeEqualHex(h, OtpProvider.hash("reset_password", "a@b.com", "123456")));
  assert.ok(!OtpProvider.safeEqualHex(h, OtpProvider.hash("verify_email", "c@d.com", "123456")));
  assert.ok(!OtpProvider.safeEqualHex(h, OtpProvider.hash("verify_email", "a@b.com", "654321")));
  assert.ok(!h.includes("123456"));
});

const work = await import("../src/constants/work.constants.js");

test("формула серебра: ставка часа, усталость, карма, множитель города", () => {
  assert.equal(work.hourlyRate(1), 2.37);
  assert.equal(work.hourlyRate(2), 3.12);
  assert.equal(work.hourlyRate(3), 3.87);
  assert.equal(work.fatigueFactor(1), 1);
  assert.ok(Math.abs(work.fatigueFactor(8) - 0.82) < 1e-9);
  assert.equal(work.karmaModifier("field"), 1.0);
  assert.equal(work.karmaModifier("gate"), 0.9);
  assert.equal(work.karmaModifier("robbery"), 0.9);
  // Терент (average), 1-й уровень
  assert.equal(work.workSilver("field", 1, 1), 2);
  assert.equal(work.workSilver("field", 8, 1), 16);
  assert.equal(work.workSilver("gate", 8, 1), 14);
  // множитель города: 18.96 · 0.82 = 15.55 → ×0.8 / ×1.15 / ×1.3
  assert.equal(work.workSilver("field", 8, 1, "low"), 12);
  assert.equal(work.workSilver("field", 8, 1, "good"), 18);
  assert.equal(work.workSilver("field", 8, 1, "excellent"), 20);
});
