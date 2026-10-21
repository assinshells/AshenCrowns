import { useEffect, useId, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { Block } from "@shared/ui/Block.jsx";
import { DataList } from "@shared/ui/DataList.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { fetchWork, startWork } from "@entities/work/api/work.api.js";
import { KarmaValue, SilverValue } from "@entities/work/ui/RewardValue.jsx";
import {
  JOB_INFO,
  KARMA_LABEL,
  WORK_HOURS,
  WORK_MAX_HOURS,
  WORK_MIN_HOURS,
  rewardFor,
} from "@entities/work/lib/jobs.js";

/**
 * Работа: ползунок времени (1–8 ч) и три карточки работ. Награды приходят с сервера и
 * меняются вместе с ползунком. «Взять работу» → страница хода работы.
 * Пока у игрока есть активная работа, сразу открывается она.
 */
export function WorkPage() {
  const navigate = useNavigate();
  const sliderId = useId();
  const [work, setWork] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [hours, setHours] = useState(WORK_MIN_HOURS);
  const { loading, error, run } = useRequest();

  useEffect(() => {
    let alive = true;
    fetchWork()
      .then((data) => alive && setWork(data))
      .catch((err) => alive && setLoadError(err));
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) return <ErrorAlert error={loadError} />;
  if (!work) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка…</span>
        </div>
      </div>
    );
  }
  if (work.active) return <Navigate to={ROUTES.workProgress} state={{ fromWork: true }} replace />;

  const take = async (kind) => {
    const started = await run(async () => {
      try {
        return await startWork(kind, hours);
      } catch (err) {
        // Работа уже идёт (например, взята в другой вкладке) — просто открываем её.
        if (err.code === "ALREADY_WORKING") return { alreadyWorking: true };
        throw err;
      }
    });
    if (started) navigate(ROUTES.workProgress, { state: { fromWork: true } });
  };

  return (
    <>
      <Block title="Время работы" className="mb-3">
        <label htmlFor={sliderId} className="form-label">
          Работать: <strong>{hours} ч</strong>
        </label>
        <input
          id={sliderId}
          type="range"
          className="form-range"
          min={WORK_MIN_HOURS}
          max={WORK_MAX_HOURS}
          step={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
        />
        <div className="d-flex justify-content-between small text-body-secondary" aria-hidden="true">
          {WORK_HOURS.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </Block>

      <ErrorAlert error={error} />

      <div className="row g-3">
        {work.jobs.map((job) => {
          const info = JOB_INFO[job.key];
          const reward = rewardFor(job, hours);
          if (!info || !reward) return null;
          // Карма — светлая или тёмная по виду работы; у нейтральной работы строки с кармой нет.
          const items = [{ label: "Серебро", value: <SilverValue amount={reward.silver} /> }];
          if (job.karma) {
            items.push({
              label: KARMA_LABEL[job.karma],
              value: <KarmaValue type={job.karma} amount={reward.karma} />,
            });
          }

          return (
            <div className="col-md-4" key={job.key}>
              <section className="card h-100" aria-label={info.title}>
                <div className="card-body d-flex flex-column gap-3">
                  <h2 className="h5 card-title mb-0">{info.title}</h2>
                  <p className="card-text text-body-secondary mb-0">{info.description}</p>
                  <DataList items={items} />
                  <button
                    type="button"
                    className="btn btn-primary mt-auto"
                    disabled={loading}
                    onClick={() => take(job.key)}
                  >
                    Взять работу
                  </button>
                </div>
              </section>
            </div>
          );
        })}
      </div>
    </>
  );
}
