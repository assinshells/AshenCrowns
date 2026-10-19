export class BaseException extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} code
   * @param {Record<string, unknown>} [extra] — дополнительные публичные поля
   *   ответа (например maskedEmail, retryAfterSeconds). Секретов здесь быть не должно.
   */
  constructor(message, statusCode, code, extra = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
    Error.captureStackTrace(this, this.constructor);
  }
}
