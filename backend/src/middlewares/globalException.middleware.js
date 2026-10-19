import logger from "../config/logger.js";
import { BaseException } from "../exceptions/base.exception.js";
import { HTTP_STATUS, AUTH_ERRORS } from "../constants/auth.constants.js";

/**
 * Единый обработчик ошибок Express. В логи попадают только код и сообщение
 * исключения — тело запроса (пароли, коды, токены) никогда не логируется.
 */
export const globalExceptionHandler = (err, _req, res, _next) => {
  if (err instanceof BaseException) {
    logger.warn(`[${err.code}] ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
        ...(err.extra ?? {}),
      },
    });
  }

  // Ошибки body-parser (невалидный JSON, слишком большое тело) — это 4xx клиента.
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Некорректный запрос" },
    });
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  return res.status(HTTP_STATUS.INTERNAL).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: AUTH_ERRORS.INTERNAL_ERROR },
  });
};
