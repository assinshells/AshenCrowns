/** Кнопка отправки формы с состоянием загрузки. */
export function SubmitButton({ loading, loadingText, children, disabled, className = "btn btn-primary" }) {
  return (
    <button type="submit" className={className} disabled={loading || disabled}>
      {loading && (
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      )}
      {loading ? loadingText : children}
    </button>
  );
}
