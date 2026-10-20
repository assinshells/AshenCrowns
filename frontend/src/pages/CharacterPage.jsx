import { Block } from "@shared/ui/Block.jsx";
import { DataList } from "@shared/ui/DataList.jsx";
import { PlaceholderBlock } from "@shared/ui/PlaceholderBlock.jsx";
import { ATTRIBUTES, formatDamage } from "@entities/character/lib/formulas.js";
import { useCharacter } from "@entities/character/model/useCharacter.js";

const NONE = "---";

/**
 * Персонаж: две колонки (1 и 3 слева, 2 и 4 справа) и длинный блок 5 под ними.
 * Блок 2 — подробная информация, блок 3 — характеристики; остальные — заглушки.
 */
export function CharacterPage() {
  const { level, attributes, derived } = useCharacter();

  // Орден, добыча и бои пока не ведутся на сервере — показываем стартовые значения.
  const details = [
    { label: "Уровень", value: level },
    { label: "Орден", value: NONE },
    { label: "Ранг ордена", value: NONE },
    { label: "Добыча (получено)", value: 0 },
    { label: "Добыча (потеряно)", value: 0 },
    { label: "Выигранные турниры", value: 0 },
    { label: "Победы", value: 0 },
    { label: "Ничьи", value: 0 },
    { label: "Поражения", value: 0 },
  ];

  const characteristics = [
    ...ATTRIBUTES.map(({ key, label }) => ({ label, value: attributes[key] })),
    { label: "Урон", value: formatDamage(derived.damage) },
    { label: "Броня", value: derived.armor },
  ];

  return (
    <div className="row g-3">
      <div className="col-md-6 d-flex flex-column gap-3">
        <PlaceholderBlock title="Блок 1" />
        <Block title="Характеристики" className="flex-grow-1">
          <DataList items={characteristics} />
        </Block>
      </div>
      <div className="col-md-6 d-flex flex-column gap-3">
        <Block title="Подробная информация">
          <DataList items={details} />
        </Block>
        <PlaceholderBlock title="Блок 4" className="flex-grow-1" />
      </div>
      <div className="col-12">
        <PlaceholderBlock title="Блок 5" long />
      </div>
    </div>
  );
}
