const CSRF_COOKIE_NAME = "ac_csrf";

/**
 * Читает CSRF-токен из cookie (double-submit). Cookie сознательно не httpOnly;
 * httpOnly-cookie сессии из JS недоступна вообще.
 */
export const getCsrfToken = () => {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
};
