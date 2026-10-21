import { Block } from "@shared/ui/Block.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { formatDuration } from "../lib/jobs.js";

/**
 * Прогресс идущей работы: оставшееся время, полоса и общая фраза (без награды).
 * Блок показывается и на других этапах игры, где игрок ждёт, поэтому не знает о страницах.
 * Отмена — сразу, без подтверждения; ничего не зачисляется.
 */
export function WorkProgressBlock({ title, remainingMs, elapsedMs, totalMs, onCancel, cancelling, error }) {
  const percent = totalMs > 0 ? Math.floor((elapsedMs / totalMs) * 100) : 100;
  return (
    <Block title={title}>
      <p className="mb-1">
        Осталось: <strong>{formatDuration(remainingMs)}</strong>
      </p>
      <progress
        className="work-progress mb-3"
        max={totalMs}
        value={elapsedMs}
        aria-label="Прогресс работы"
        aria-valuetext={`${percent}%`}
      />
      <p className="text-body-secondary mb-3">
        Сейчас вы отсутствуете, так как зарабатываете себе на жизнь.
      </p>
      <ErrorAlert error={error} />
      <button type="button" className="btn btn-outline-danger" disabled={cancelling} onClick={onCancel}>
        Отменить работу
      </button>
    </Block>
  );
}
