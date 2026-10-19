export function Spinner({ label = "Загрузка…" }) {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  );
}
