import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Поле формы на классах Bootstrap: label + input + подсказка.
 * Для type="password" внутри поля (справа) добавляется кнопка «показать/скрыть
 * пароль» без рамок и фона — стили в app/styles/app.css (.password-field).
 */
export function TextField({ id, label, hint, type = "text", ...inputProps }) {
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Скрыть пароль" : "Показать пароль";
  const EyeIcon = visible ? EyeOff : Eye;

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
        <div className="password-field">
          {input}
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={toggleLabel}
            aria-controls={id}
            aria-pressed={visible}
            title={toggleLabel}
            disabled={inputProps.disabled}
          >
            <EyeIcon size={18} aria-hidden="true" />
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
