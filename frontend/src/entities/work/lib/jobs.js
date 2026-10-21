export const WORK_MIN_HOURS = 1;
export const WORK_MAX_HOURS = 8;
export const WORK_HOURS = Array.from(
  { length: WORK_MAX_HOURS - WORK_MIN_HOURS + 1 },
  (_, i) => WORK_MIN_HOURS + i,
);

/** Тексты работ. Числа (серебро, карма) приходят с сервера — там они считаются и начисляются. */
export const JOB_INFO = Object.freeze({
  gate: {
    title: "Охрана ворот",
    description:
      "Стойте на страже городских ворот и проверяйте путников. Честная служба приносит светлую карму.",
  },
  field: {
    title: "Работа в поле",
    description:
      "Помогайте крестьянам с посевом и уборкой урожая. Тяжёлый труд платят чуть лучше, на карму он не влияет.",
  },
  robbery: {
    title: "Грабёж",
    description:
      "Подстерегайте торговцев на ночных дорогах. Добыча быстрая, но такое ремесло приносит тёмную карму.",
  },
});

export const KARMA_LABEL = Object.freeze({ light: "Светлая карма", dark: "Тёмная карма" });

/** Награда за выбранное число часов (серебро и карма — без знака). */
export const rewardFor = (job, hours) => job.rewards.find((r) => r.hours === hours);

/** 3725000 мс → «01:02:05». */
export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Знак числа кармы работы → цвет: > 0 светлая, < 0 тёмная, 0 — кармы нет (нейтральная работа). */
export const karmaType = (karma) => (karma > 0 ? "light" : karma < 0 ? "dark" : null);
