import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Поле формы на стандартных классах Bootstrap: label + input + подсказка.
 * Для type="password" автоматически добавляется кнопка «показать/скрыть пароль».
 */
export function TextField({ id, label, hint, type = "text", ...inputProps }) {
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  const input = (
    <input
      id={id}
      type={isPassword && visible ? "text" : type}
      className="form-control"
      aria-describedby={hint ? `${id}-hint` : undefined}
      {...inputProps}
    />
  );

  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {isPassword ? (
        <div className="input-group">
          {input}
          <button
            type="button"
            className="btn btn-outline-secondary d-inline-flex align-items-center"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
            aria-controls={id}
            aria-pressed={visible}
            title={visible ? "Скрыть пароль" : "Показать пароль"}
          >
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      ) : (
        input
      )}
      {hint && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
    </div>
  );
}
