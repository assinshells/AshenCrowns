import { HTTP_STATUS } from "../constants/auth.constants.js";

export const notFoundHandler = (_req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Маршрут не найден" },
  });
};
