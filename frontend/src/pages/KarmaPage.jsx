import { useId, useState } from "react";
import { Moon, Sun } from "lucide-react";

// По умолчанию обе кармы — 0 (значения появятся из профиля игрока позже).
const TABS = [
  { key: "dark", label: "Тёмная карма", Icon: Moon, value: 0 },
  { key: "light", label: "Светлая карма", Icon: Sun, value: 0 },
];

/** Силы кармы: вкладки «Тёмная / Светлая карма», в каждой — счётчик. */
export function KarmaPage() {
  const [active, setActive] = useState(TABS[0].key);
  const baseId = useId();

  return (
    <>
      <ul className="nav nav-tabs flex-nowrap overflow-x-auto overflow-y-hidden text-nowrap mb-4" role="tablist">
        {TABS.map(({ key, label, Icon }) => (
          <li className="nav-item" role="presentation" key={key}>
            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-${key}`}
              aria-controls={`${baseId}-panel-${key}`}
              aria-selected={active === key}
              className={`nav-link d-flex align-items-center gap-2${active === key ? " active" : ""}`}
              onClick={() => setActive(key)}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
      </ul>

      {TABS.filter(({ key }) => key === active).map(({ key, label, value }) => (
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
