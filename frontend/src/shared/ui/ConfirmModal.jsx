import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Модальное окно подтверждения на классах Bootstrap (без Bootstrap JS).
 * Закрывается по «Нет», крестику, клику на фон и Escape (пока не идёт запрос).
 * children — дополнительное содержимое (например, поле пароля).
 */
export function ConfirmModal({
  open,
  title,
  children,
  confirmText = "Да",
  cancelText = "Нет",
  confirmVariant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);

  // Актуальные значения для обработчика Escape без переподписки на каждый рендер.
  const guard = useRef({ loading, onCancel });
  useEffect(() => {
    guard.current = { loading, onCancel };
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !guard.current.loading) guard.current.onCancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm();
  };

  return createPortal(
    <>
      <div className="modal-backdrop show" />
      <div
        className="modal d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !loading) onCancel();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" ref={dialogRef} tabIndex={-1}>
          <form className="modal-content" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="modal-header">
              <h2 id={titleId} className="modal-title h5">
                {title}
              </h2>
              <button
                type="button"
                className="btn-close"
                aria-label="Закрыть"
                onClick={onCancel}
                disabled={loading}
              />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer flex-column-reverse flex-sm-row align-items-stretch align-items-sm-center">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelText}
              </button>
              <button type="submit" className={`btn btn-${confirmVariant}`} disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                {confirmText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
