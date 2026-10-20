/** Блок страницы (стандартный Bootstrap .card): заголовок и содержимое. */
export function Block({ title, long = false, className = "", children }) {
  return (
    <section className={`card ${className}`.trim()} aria-label={title}>
      <div className={`card-body${long ? " py-5" : ""}`}>
        <h2 className="h6 card-title mb-3">{title}</h2>
        {children}
      </div>
    </section>
  );
}
