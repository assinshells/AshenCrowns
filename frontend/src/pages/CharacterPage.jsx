import { PlaceholderBlock } from "@shared/ui/PlaceholderBlock.jsx";

/**
 * Персонаж: две колонки (1 и 3 слева, 2 и 4 справа) и длинный блок 5 под ними.
 * Блоки — заглушки.
 */
export function CharacterPage() {
  return (
    <div className="row g-3">
      <div className="col-md-6 d-flex flex-column gap-3">
        <PlaceholderBlock title="Блок 1" />
        <PlaceholderBlock title="Блок 3" className="flex-grow-1" />
      </div>
      <div className="col-md-6 d-flex flex-column gap-3">
        <PlaceholderBlock title="Блок 2" />
        <PlaceholderBlock title="Блок 4" className="flex-grow-1" />
      </div>
      <div className="col-12">
        <PlaceholderBlock title="Блок 5" long />
      </div>
    </div>
  );
}
