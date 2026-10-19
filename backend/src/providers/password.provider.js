import crypto from "crypto";

/**
 * scrypt (memory-hard KDF, встроен в Node) с параметрами не ниже
 * рекомендаций OWASP (N=2^15, r=8, p=1). Параметры сохраняются внутри
 * строки хеша, поэтому их можно усиливать позже без поломки старых хешей.
 *
 * Формат: scrypt$N$r$p$saltHex$hashHex
 */
const PARAMS = { N: 32768, r: 8, p: 1 };
const KEYLEN = 64;
const SALT_LENGTH = 16;
const MAXMEM = 128 * 1024 * 1024;

const derive = (password, salt, { N, r, p }) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      KEYLEN,
      { N, r, p, maxmem: MAXMEM },
      (err, key) => (err ? reject(err) : resolve(key)),
    );
  });

export const PasswordProvider = {
  async hash(password) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = await derive(password, salt, PARAMS);
    return [
      "scrypt",
      PARAMS.N,
      PARAMS.r,
      PARAMS.p,
      salt.toString("hex"),
      key.toString("hex"),
    ].join("$");
  },

  async verify(password, stored) {
    if (typeof stored !== "string") return false;
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const [, N, r, p, saltHex, hashHex] = parts;
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== KEYLEN) return false;

    const candidate = await derive(password, Buffer.from(saltHex, "hex"), {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return crypto.timingSafeEqual(candidate, expected);
  },

  /**
   * Выполняет «холостую» проверку, чтобы время ответа login не выдавало,
   * существует ли пользователь с таким email.
   */
  async dummyVerify(password) {
    await derive(password, Buffer.alloc(SALT_LENGTH), PARAMS);
    return false;
  },
};
