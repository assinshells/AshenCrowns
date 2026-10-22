import { useEffect, useId, useState } from "react";
import { MapPin, Lock } from "lucide-react";
import { Block } from "@shared/ui/Block.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { fetchCity, fetchWorld } from "@entities/world/api/world.api.js";
import { RISK_LABEL, eventText, levelLabel, riskLevel } from "@entities/world/lib/world.js";

function Locations({ cityId }) {
  const [state, setState] = useState({ loading: true, error: null, locations: [] });

  useEffect(() => {
    let alive = true;
    fetchCity(cityId)
      .then((data) => alive && setState({ loading: false, error: null, locations: data.locations }))
      .catch((error) => alive && setState({ loading: false, error, locations: [] }));
    return () => {
      alive = false;
    };
  }, [cityId]);

  if (state.loading) {
    return (
      <div className="d-flex justify-content-center py-3">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Загрузка…</span>
        </div>
      </div>
    );
  }
  if (state.error) return <ErrorAlert error={state.error} />;

  return (
    <ul className="list-group">
      {state.locations.map((loc) => {
        const risk = riskLevel(loc.risk);
        return (
          <li
            key={loc.id}
            className={`list-group-item d-flex justify-content-between align-items-center gap-3${
              loc.accessible ? "" : " text-body-secondary"
            }`}
          >
            <span>
              {!loc.accessible && <Lock size={14} className="me-1" aria-hidden="true" />}
              {loc.name}
            </span>
            <span className="text-end">
              {!loc.accessible && (
                <span className="me-2 small">
                  {loc.requiresQuest ? "Нужен квест" : levelLabel(loc.requiredLevel)}
                </span>
              )}
              <span className={`badge ${risk.badge}`}>
                {RISK_LABEL}: {risk.label}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CityItem({ city, open, onToggle }) {
  const id = useId();
  const panelId = `${id}-panel`;
  const note = eventText(city.event);
  const expanded = open && city.accessible;

  return (
    <div className="accordion-item">
      <h3 className="accordion-header">
        <button
          type="button"
          className={`accordion-button${expanded ? "" : " collapsed"}`}
          aria-expanded={expanded}
          aria-controls={panelId}
          disabled={!city.accessible}
          onClick={onToggle}
        >
          <span className="me-2">{city.name}</span>
          {city.event && <span className="badge text-bg-primary me-2">Событие</span>}
          {city.isCurrent && (
            <span className="badge text-bg-success d-inline-flex align-items-center gap-1 me-2">
              <MapPin size={14} aria-hidden="true" />
              Вы находитесь здесь
            </span>
          )}
          {!city.accessible && (
            <span className="badge text-bg-secondary d-inline-flex align-items-center gap-1">
              <Lock size={14} aria-hidden="true" />
              {levelLabel(city.requiredLevel)}
            </span>
          )}
        </button>
      </h3>
      {note && <div className="px-3 pb-2 small text-body-secondary">{note}</div>}
      <div id={panelId} className={`accordion-collapse collapse${expanded ? " show" : ""}`}>
        <div className="accordion-body">{expanded && <Locations cityId={city.id} />}</div>
      </div>
    </div>
  );
}

/**
 * Мир → Карта мира. Города и локации приходят с сервера (GET /api/world, GET /api/world/cities/:id):
 * доступность считает сервер по уровню персонажа и календарю событий. Закрытые города видны,
 * но неактивны (требуемый уровень / состояние события); локации загружаются при раскрытии города.
 */
export function WorldMapPage() {
  const [world, setWorld] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchWorld()
      .then((data) => {
        if (!alive) return;
        setWorld(data);
        setOpenId(data.currentCityId);
      })
      .catch((err) => alive && setError(err));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <ErrorAlert error={error} />;
  if (!world) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка…</span>
        </div>
      </div>
    );
  }

  const permanent = world.cities.filter((c) => c.kind === "permanent");
  const events = world.cities.filter((c) => c.kind === "event");
  const renderList = (cities) => (
    <div className="accordion">
      {cities.map((city) => (
        <CityItem
          key={city.id}
          city={city}
          open={openId === city.id}
          onToggle={() => setOpenId(openId === city.id ? null : city.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      <Block title="Города" className="mb-3">
        {renderList(permanent)}
      </Block>
      {events.length > 0 && <Block title="Города событий">{renderList(events)}</Block>}
    </>
  );
}
