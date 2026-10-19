export function StubPage({ title, children }) {
  return (
    <>
      <h1 className="h3 mb-3">{title}</h1>
      <p className="text-body-secondary">{children ?? "Раздел в разработке."}</p>
    </>
  );
}
