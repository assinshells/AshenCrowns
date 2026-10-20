/** Список «название — значение» (<dl> на сетке Bootstrap). items: [{ label, value }]. */
export function DataList({ items }) {
  return (
    <dl className="row gy-1 mb-0">
      {items.map(({ label, value }) => (
        <div className="col-12 d-flex justify-content-between gap-3" key={label}>
          <dt className="fw-normal text-body-secondary">{label}</dt>
          <dd className="mb-0 fw-semibold text-end">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
