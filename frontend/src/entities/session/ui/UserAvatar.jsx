/** Маленький аватар рядом с именем. Путь берётся из профиля, по умолчанию — стабильный статический. */
export function UserAvatar({ src, size = 32 }) {
  return (
    <img
      src={src || "/avatars/default.svg"}
      alt=""
      width={size}
      height={size}
      className="rounded-circle"
    />
  );
}
