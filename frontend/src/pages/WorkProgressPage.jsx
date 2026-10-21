import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/constants/routes.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { cancelWork, claimWork, fetchWork } from "@entities/work/api/work.api.js";
import { JOB_INFO } from "@entities/work/lib/jobs.js";
import { WorkPayoutBlock } from "@entities/work/ui/WorkPayoutBlock.jsx";
import { WorkProgressBlock } from "@entities/work/ui/WorkProgressBlock.jsx";

// Сверка с сервером: не реже раза в POLL_MS (подхватывает смену времени окончания,
// например при проверке через БД), после конца времени — каждые RETRY_MS, пока сервер не подтвердит.
const POLL_MS = 5000;
const RETRY_MS = 1500;

/** Страница хода работы доступна только как переход с «Работы»: по прямой ссылке — редирект. */
export function WorkProgressPage() {
  const { state } = useLocation();
  if (!state?.fromWork) return <Navigate to={ROUTES.work} replace />;
  return <WorkProgress />;
}

function WorkProgress() {
  const navigate = useNavigate();
  const updateStats = useSessionStore((s) => s.updateStats);
  const loadProfile = useSessionStore((s) => s.load);
  const cancelRequest = useRequest();
  const claimRequest = useRequest();

  // offset = серверное время − часы браузера: прогресс считается по серверному времени.
  const [snap, setSnap] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  const sync = useCallback(async () => {
    const data = await fetchWork();
    return { data, offset: Date.parse(data.serverTime) - Date.now() };
  }, []);

  const apply = useCallback(
    ({ data, offset }) => {
      if (!data.active) {
        navigate(ROUTES.work, { replace: true }); // работы нет — смотреть нечего
        return;
      }
      setSnap({ active: data.active, offset });
      setNow(Date.now()); // отсчёт стартует с серверного времени, а не с момента монтирования
    },
    [navigate],
  );

  useEffect(() => {
    let alive = true;
    sync()
      .then((result) => alive && apply(result))
      .catch((err) => alive && setLoadError(err));
    return () => {
      alive = false;
    };
  }, [sync, apply]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const active = snap?.active ?? null;
  const finished = Boolean(active?.finished);

  // Пока работа идёт: ближайшая сверка с сервером. Конец времени определяет сервер (finished),
  // а не часы браузера. Ошибка сети — просто повтор (tick перезапускает эффект).
  useEffect(() => {
    if (!active || finished) return undefined;
    const untilEnd = Date.parse(active.endsAt) - (Date.now() + snap.offset);
    const delay = untilEnd <= 0 ? RETRY_MS : Math.min(POLL_MS, untilEnd + 200);
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const result = await sync();
        if (alive) apply(result);
      } catch {
        /* повторим при следующем тике */
      } finally {
        if (alive) setTick((t) => t + 1);
      }
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, finished, snap, tick, sync, apply]);

  const cancel = async () => {
    const outcome = await cancelRequest.run(async () => {
      const res = await cancelWork();
      if (res.cancelled) return "cancelled";
      apply(await sync()); // время уже вышло — вместо отмены покажем оплату
      return "finished";
    });
    if (outcome === "cancelled") navigate(ROUTES.work, { replace: true });
  };

  const claim = async () => {
    const stats = await claimRequest.run(async () => {
      try {
        return await claimWork();
      } catch (err) {
        // Оплата уже принята (например, в другой вкладке) — просто обновляем профиль.
        if (err.code === "NOTHING_TO_CLAIM") {
          await loadProfile();
          return null;
        }
        throw err;
      }
    });
    if (stats === undefined) return; // ошибка показана в блоке
    if (stats) updateStats(stats);
    navigate(ROUTES.work, { replace: true });
  };

  if (loadError) return <ErrorAlert error={loadError} />;

  if (!active) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Загрузка…</span>
        </div>
      </div>
    );
  }

  const title = JOB_INFO[active.kind]?.title ?? "Работа";

  if (finished) {
    return (
      <WorkPayoutBlock
        title={title}
        silver={active.silver}
        karma={active.karma}
        onClaim={claim}
        claiming={claimRequest.loading}
        error={claimRequest.error}
      />
    );
  }

  const startedAt = Date.parse(active.startedAt);
  const endsAt = Date.parse(active.endsAt);
  const serverNow = now + snap.offset;
  const totalMs = endsAt - startedAt;

  return (
    <WorkProgressBlock
      title={title}
      remainingMs={endsAt - serverNow}
      elapsedMs={Math.min(Math.max(serverNow - startedAt, 0), totalMs)}
      totalMs={totalMs}
      onCancel={cancel}
      cancelling={cancelRequest.loading}
      error={cancelRequest.error}
    />
  );
}
