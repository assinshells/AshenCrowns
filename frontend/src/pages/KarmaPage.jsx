import { useId, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useCharacter } from "@entities/character/model/useCharacter.js";

/**
 * Силы кармы: вкладки «Тёмная / Светлая карма», в каждой — счётчик.
 * Открыта вкладка, где кармы больше (при равенстве — первая); пока игрок сам не переключил.
 */
export function KarmaPage() {
  const { karma } = useCharacter();
  const tabs = [
    { key: "dark", label: "Тёмная карма", Icon: Moon, value: karma.dark },
    { key: "light", label: "Светлая карма", Icon: Sun, value: karma.light },
  ];

  const [picked, setPicked] = useState(null);
  const strongest = karma.light > karma.dark ? "light" : "dark";
  const active = picked ?? strongest;
  const baseId = useId();

  return (
    <>
      <ul className="nav nav-tabs flex-nowrap overflow-x-auto overflow-y-hidden text-nowrap mb-4" role="tablist">
        {tabs.map(({ key, label, Icon }) => (
          <li className="nav-item" role="presentation" key={key}>
            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-${key}`}
              aria-controls={`${baseId}-panel-${key}`}
              aria-selected={active === key}
              className={`nav-link d-flex align-items-center gap-2${active === key ? " active" : ""}`}
              onClick={() => setPicked(key)}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
      </ul>

      {tabs
        .filter(({ key }) => key === active)
        .map(({ key, label, value }) => (
          <div
            key={key}
            role="tabpanel"
            id={`${baseId}-panel-${key}`}
            aria-labelledby={`${baseId}-tab-${key}`}
          >
            <div className="card">
              <div className="card-body">
                <h2 className="h6 card-title">{label}</h2>
                <p className="display-4 fw-semibold mb-0">{value}</p>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
