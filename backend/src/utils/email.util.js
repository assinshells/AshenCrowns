/**
 * Email хранится и сравнивается в нижнем регистре без пробелов по краям.
 * Уникальность в БД обеспечивается индексом по lower(email).
 */
export const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const maskPart = (part) => {
  if (part.length <= 1) return `${part}***`;
  if (part.length === 2) return `${part[0]}***`;
  return `${part[0]}***${part[part.length - 1]}`;
};

/**
 * Частично скрывает email для показа в интерфейсе:
 *   john.doe@gmail.com -> j***e@g***l.com
 * Метка TLD (.com) остаётся видимой, чтобы пользователь узнал адрес.
 */
export const maskEmail = (email) => {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 1) return "***";

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const dot = domain.indexOf(".");

  const maskedDomain =
    dot > 0 ? `${maskPart(domain.slice(0, dot))}${domain.slice(dot)}` : maskPart(domain);

  return `${maskPart(local)}@${maskedDomain}`;
};
