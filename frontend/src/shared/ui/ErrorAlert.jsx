/** Сообщение об ошибке (message + список ошибок валидации). */
export function ErrorAlert({ error }) {
  if (!error) return null;
  const details = error.details ?? [];
  return (
    <div className="alert alert-danger" role="alert">
      <div>{error.message}</div>
      {details.length > 0 && (
        <ul className="mb-0 mt-2">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
