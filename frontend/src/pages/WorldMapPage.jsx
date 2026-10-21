import { useId, useState } from "react";
import { MapPin } from "lucide-react";
import { Block } from "@shared/ui/Block.jsx";
import { useCharacter } from "@entities/character/model/useCharacter.js";
import {
  PRICE_LABEL,
  PRICE_LEVELS,
  citiesForLevel,
  currentCityKey,
  payTier,
} from "@entities/world/lib/cities.js";

function CityItem({ city, isHere, open, onToggle }) {
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    <div className="accordion-item">
      <h3 className="accordion-header">
        <button
          type="button"
          className={`accordion-button${open ? "" : " collapsed"}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="me-2">{city.name}</span>
          {isHere && (
            <span className="badge text-bg-success d-inline-flex align-items-center gap-1">
              <MapPin size={14} aria-hidden="true" />
              Вы находитесь здесь
            </span>
          )}
        </button>
      </h3>
      <div id={panelId} className={`accordion-collapse collapse${open ? " show" : ""}`}>
        <div className="accordion-body">
          <ul className="list-group">
            {city.jobs.map((job) => (
              <li key={job.key} className="list-group-item d-flex justify-content-between gap-3">
                <span>{job.title}</span>
                <span className="text-body-secondary text-end">{payTier(job.pay).label}</span>
              </li>
            ))}
            <li className="list-group-item d-flex justify-content-between gap-3">
              <span>{PRICE_LABEL}</span>
              <span className="text-body-secondary text-end">{PRICE_LEVELS[city.prices]}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Мир → Карта мира: список открытых городов (раскрывающийся). У каждого — работы с уровнем
 * оплаты и коэффициентом, уровень цен на вещи; текущий город отмечен. Новые города
 * открываются с ростом уровня персонажа (см. entities/world/lib/cities.js).
 */
export function WorldMapPage() {
  const { level } = useCharacter();
  const here = currentCityKey();
  const cities = citiesForLevel(level);
  const [openKey, setOpenKey] = useState(here);

  return (
    <Block title="Города">
      <div className="accordion">
        {cities.map((city) => (
          <CityItem
            key={city.key}
            city={city}
            isHere={city.key === here}
            open={openKey === city.key}
            onToggle={() => setOpenKey(openKey === city.key ? null : city.key)}
          />
        ))}
      </div>
    </Block>
  );
}
