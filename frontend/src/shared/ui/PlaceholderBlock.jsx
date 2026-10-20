/**
 * Блок-заглушка будущего содержимого (стандартный Bootstrap .card).
 * long — вытянутый блок (больше вертикальных отступов).
 */
export function PlaceholderBlock({ title, long = false, className = "" }) {
  return (
    <section className={`card ${className}`.trim()} aria-label={title}>
      <div className={`card-body${long ? " py-5" : ""}`}>
        <h2 className="h6 card-title">{title}</h2>
        <p className="card-text text-body-secondary mb-0">Заглушка</p>
      </div>
    </section>
  );
}
