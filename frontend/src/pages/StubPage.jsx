/** Заготовка раздела в разработке. Заголовок страницы показывает верхняя панель (TopBar). */
export function StubPage({ children }) {
  return <p className="text-body-secondary">{children ?? "Раздел в разработке."}</p>;
}
