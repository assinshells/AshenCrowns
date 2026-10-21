import { Block } from "@shared/ui/Block.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { karmaType } from "../lib/jobs.js";
import { KarmaValue, SilverValue } from "./RewardValue.jsx";

/**
 * Работа закончена: что заработано и кнопка «Принять оплату». Серебро и карма
 * зачисляются сервером только после нажатия. У нейтральной работы кармы нет.
 */
export function WorkPayoutBlock({ title, silver, karma, onClaim, claiming, error }) {
  const type = karmaType(karma);
  return (
    <Block title={title}>
      <p className="mb-2">Во время работы вы заработали:</p>
      <ul className="list-unstyled d-flex flex-wrap gap-3 mb-3 fs-5 fw-semibold">
        <li aria-label={`Серебро: ${silver}`}>
          <SilverValue amount={silver} />
        </li>
        {type && (
          <li aria-label={`${type === "light" ? "Светлая" : "Тёмная"} карма: ${Math.abs(karma)}`}>
            <KarmaValue type={type} amount={Math.abs(karma)} />
          </li>
        )}
      </ul>
      <ErrorAlert error={error} />
      <button type="button" className="btn btn-primary" disabled={claiming} onClick={onClaim}>
        Принять оплату
      </button>
    </Block>
  );
}
