/** Поле только для чтения (например, замаскированный текущий email). */
export function ReadonlyField({ id, label, value, hint }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <input id={id} className="form-control-plaintext" value={value ?? ""} readOnly />
      {hint && <div className="form-text">{hint}</div>}
    </div>
  );
}
