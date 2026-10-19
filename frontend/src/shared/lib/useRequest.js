import { useCallback, useState } from "react";

/**
 * useRequest — состояние запроса формы: loading / error.
 * run(fn) выполняет fn, возвращает результат либо undefined при ошибке
 * (ошибка сохраняется в `error`).
 */
export function useRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, run, clearError, setError };
}
