import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { Block } from "@shared/ui/Block.jsx";
import { ConfirmModal } from "@shared/ui/ConfirmModal.jsx";
import { DataList } from "@shared/ui/DataList.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { cancelWork, fetchWork } from "@entities/work/api/work.api.js";
import { JOB_INFO, KARMA_LABEL, formatDuration } from "@entities/work/lib/jobs.js";

const RETRY_MS = 1500;

/** Страница хода работы доступна только как переход с «Работы»: по прямой ссылке — редирект. */
export function WorkProgressPage() {
  const { state } = useLocation();
  if (!state?.fromWork) return <Navigate to={ROUTES.work} replace />;
  return <WorkProgress />;
}

const karmaItem = (karma) =>
  karma === 0
    ? []
    : [{ label: karma > 0 ? KARMA_LABEL.light : KARMA_LABEL.dark, value: Math.abs(karma) }];

function WorkProgress() {
  const navigate = useNavigate();
  const loadProfile = useSessionStore((s) => s.load);
  const { loading: cancelling, error, run } = useRequest();

  // offset = серверное время − часы браузера: прогресс считается по серверному времени.
  const [snap, setSnap] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const jobId = useRef(null);

  const sync = useCallback(async () => {
    const data = await fetchWork();
    return { data, offset: Date.parse(data.serverTime) - Date.now() };
  }, []);

  useEffect(() => {
    let alive = true;
    sync()
      .then(({ data, offset }) => {
        if (!alive) return;
        if (!data.active) {
          navigate(ROUTES.work, { replace: true }); // нет работы — смотреть нечего
          return;
        }
        jobId.current = data.active.id;
        setSnap({ active: data.active, offset });
        setNow(Date.now()); // отсчёт стартует с серверного времени, не с момента монтирования
      })
      .catch((err) => alive && setLoadError(err));
    return () => {
      alive = false;
    };
  }, [sync, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = snap?.active ?? null;
  const endsAt = active ? Date.parse(active.endsAt) : 0;
  const startedAt = active ? Date.parse(active.startedAt) : 0;
  const serverNow = now + (snap?.offset ?? 0);
  const timeUp = Boolean(active) && serverNow >= endsAt;

  // Время вышло: сервер зачисляет награду (в любом своём запросе) — спрашиваем итог.
  useEffect(() => {
    if (!timeUp) return undefined;
    let alive = true;
    let timer;
    const settle = async () => {
      try {
        const { data, offset } = await sync();
        if (!alive) return;
        if (data.active) {
          // Часы чуть разошлись — сервер считает, что ещё идёт. Повторим.
          setSnap({ active: data.active, offset });
          timer = setTimeout(settle, RETRY_MS);
          return;
        }
        await loadProfile(); // серебро и карма в верхней панели и на страницах
        if (!alive) return;
        if (data.last?.id === jobId.current && data.last.status === "completed") {
          setResult(data.last);
        } else {
          navigate(ROUTES.work, { replace: true });
        }
      } catch {
        if (alive) timer = setTimeout(settle, RETRY_MS * 2);
      }
    };
    settle();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [timeUp, sync, loadProfile, navigate]);

  const cancel = async () => {
    const res = await run(cancelWork);
    if (!res) return;
    setConfirmOpen(false);
    await loadProfile();
    navigate(ROUTES.work, { replace: true });
  };

  if (loadError) return <ErrorAlert error={loadError} />;

  if (result) {
    const info = JOB_INFO[result.kind];
    return (
      <Block title={`${info.title}: работа завершена`}>
        <div className="alert alert-success" role="status">
          Награда получена.
        </div>
        <DataList items={[{ label: "Серебро", value: result.silver }, ...karmaItem(result.karma)]} />
        <button
          type="button"
          className="btn btn-primary mt-3"
          onClick={() => navigate(ROUTES.work, { replace: true })}
        >
          К списку работ
        </button>
      </Block>
    );
  }

  if (!active) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка…</span>
        </div>
      </div>
    );
  }

  const info = JOB_INFO[active.kind];
  const total = endsAt - startedAt;
  const elapsed = Math.min(Math.max(serverNow - startedAt, 0), total);
  const percent = total > 0 ? Math.floor((elapsed / total) * 100) : 100;

  return (
    <>
      <Block title={`${info.title}: время работы`}>
        <p className="mb-1">
          Осталось: <strong>{formatDuration(endsAt - serverNow)}</strong>
        </p>
        <progress
          className="work-progress mb-3"
          max={total}
          value={elapsed}
          aria-label="Прогресс работы"
          aria-valuetext={`${percent}%`}
        />
        <DataList
          items={[
            { label: "Время работы", value: `${active.hours} ч` },
            { label: "Серебро по окончании", value: active.silver },
            ...karmaItem(active.karma),
          ]}
        />
        <ErrorAlert error={error} />
        <button
          type="button"
          className="btn btn-outline-danger mt-3"
          disabled={cancelling || timeUp}
          onClick={() => setConfirmOpen(true)}
        >
          Отменить работу
        </button>
      </Block>

      <ConfirmModal
        open={confirmOpen}
        title="Отменить работу?"
        confirmText="Отменить работу"
        cancelText="Продолжить работу"
        loading={cancelling}
        onConfirm={cancel}
        onCancel={() => setConfirmOpen(false)}
      >
        Серебро и карма за эту работу зачислены не будут.
      </ConfirmModal>
    </>
  );
}
