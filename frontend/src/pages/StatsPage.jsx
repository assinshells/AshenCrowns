import { Plus } from "lucide-react";
import { Block } from "@shared/ui/Block.jsx";
import { DataList } from "@shared/ui/DataList.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { PlaceholderBlock } from "@shared/ui/PlaceholderBlock.jsx";
import { useRequest } from "@shared/lib/useRequest.js";
import { upgradeAttribute } from "@entities/character/api/character.api.js";
import {
  ATTRIBUTES,
  formatDamage,
  upgradeCost,
} from "@entities/character/lib/formulas.js";
import { useCharacter } from "@entities/character/model/useCharacter.js";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";

/**
 * Характеристики: блоки 1 и 2 в ряд, под ними блок 3 из двух половин —
 * слева характеристики с ценой и кнопкой «+», справа производные значения.
 * Кнопка активна, только если серебра хватает на повышение; серебро списывает сервер.
 */
export function StatsPage() {
  const { silver, health, maxHealth, attributes, derived, karma } = useCharacter();
  const updateStats = useSessionStore((s) => s.updateStats);
  const loadProfile = useSessionStore((s) => s.load);
  const { loading, error, run } = useRequest();

  const upgrade = async (key) => {
    const stats = await run(async () => {
      try {
        return await upgradeAttribute(key);
      } catch (err) {
        // Серебро на клиенте устарело (например, потрачено в другой вкладке) — сверяемся с сервером.
        if (err.code === "INSUFFICIENT_SILVER") await loadProfile();
        throw err;
      }
    });
    if (stats) updateStats(stats);
  };

  // Светлая и тёмная не бывают одновременно: показываем ту, что есть.
  const karmaText =
    karma.light > 0 ? `${karma.light} (светлая)` : karma.dark > 0 ? `${karma.dark} (тёмная)` : 0;

  const derivedItems = [
    { label: "Пункты жизни", value: `${health} / ${maxHealth}` },
    { label: "Карма", value: karmaText },
    { label: "Урон", value: formatDamage(derived.damage) },
    { label: "Броня", value: derived.armor },
    { label: "Шанс на удар", value: derived.hitChance },
    { label: "Шанс на защиту", value: derived.blockChance },
  ];

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <PlaceholderBlock title="Блок 1" className="h-100" />
      </div>
      <div className="col-md-6">
        <PlaceholderBlock title="Блок 2" className="h-100" />
      </div>
      <div className="col-12">
        <Block title="Характеристики">
          <ErrorAlert error={error} />
          <div className="row g-4">
            <div className="col-md-6 divider-md-end">
              <ul className="list-group list-group-flush">
                {ATTRIBUTES.map(({ key, label }) => {
                  const value = attributes[key];
                  const cost = upgradeCost(value);
                  return (
                    <li className="list-group-item d-flex align-items-center gap-3 px-0" key={key}>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{label}</div>
                        <div className="small text-body-secondary">
                          Базовое значение: {value} · Цена: {cost}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm d-inline-flex align-items-center"
                        title="Повысить характеристику"
                        aria-label={`Повысить характеристику «${label}» за ${cost} серебра`}
                        disabled={loading || silver < cost}
                        onClick={() => upgrade(key)}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="col-md-6">
              <DataList items={derivedItems} />
            </div>
          </div>
        </Block>
      </div>
    </div>
  );
}
