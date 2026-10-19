import { ApiError } from "@shared/api/http.js";

/**
 * Клиентская проверка «пароль = подтверждение». Возвращает true, если совпали;
 * иначе выставляет ошибку формы (setError из useRequest) и возвращает false.
 */
export const passwordsMatch = (password, confirmPassword, setError) => {
  if (password === confirmPassword) return true;
  setError(new ApiError("Пароли не совпадают"));
  return false;
};
