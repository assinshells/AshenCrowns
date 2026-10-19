/** Поле формы на стандартных классах Bootstrap: label + input + подсказка. */
export function TextField({ id, label, hint, ...inputProps }) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <input
        id={id}
        className="form-control"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
      {hint && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
    </div>
  );
}
