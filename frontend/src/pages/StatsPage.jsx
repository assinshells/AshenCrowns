import { PlaceholderBlock } from "@shared/ui/PlaceholderBlock.jsx";

/** Характеристики: блоки 1 и 2 в ряд, под ними длинный блок 3. Блоки — заглушки. */
export function StatsPage() {
  return (
    <div className="row g-3">
      <div className="col-md-6">
        <PlaceholderBlock title="Блок 1" className="h-100" />
      </div>
      <div className="col-md-6">
        <PlaceholderBlock title="Блок 2" className="h-100" />
      </div>
      <div className="col-12">
        <PlaceholderBlock title="Блок 3" long />
      </div>
    </div>
  );
}
