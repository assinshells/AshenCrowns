/** Информационное/успешное сообщение. */
export function Notice({ children, variant = "success" }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${variant}`} role="status">
      {children}
    </div>
  );
}
