import { WorkRepository } from "../repositories/work.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import {
  AlreadyWorkingException,
  NothingToClaimException,
} from "../exceptions/auth.exceptions.js";
import { workCatalog, workKarma, workSilver } from "../constants/work.constants.js";

const toWorkDto = (w) =>
  w && {
    id: Number(w.id),
    kind: w.kind,
    hours: w.hours,
    silver: w.silver,
    karma: w.karma, // > 0 светлая, < 0 тёмная, 0 — нейтральная работа
    status: w.status,
    // true — время вышло, ждёт «Принять оплату». Считает сервер, а не часы клиента.
    finished: Boolean(w.finished),
    startedAt: w.started_at.toISOString(),
    endsAt: w.ends_at.toISOString(),
  };

export const WorkService = {
  /**
   * Каталог наград + активная работа. serverTime — серверные часы: клиент считает по ним прогресс.
   */
  async getState(user) {
    const active = await WorkRepository.findActive(user.id);
    const serverTime = active?.server_time ?? (await WorkRepository.serverTime());
    return {
      jobs: workCatalog(user.level),
      active: toWorkDto(active),
      serverTime: serverTime.toISOString(),
    };
  },

  /** Награда рассчитывается здесь; от клиента принимаются только вид работы и часы. */
  async start(user, { kind, hours }) {
    const work = await WorkRepository.create({
      userId: user.id,
      kind,
      hours,
      silver: workSilver(kind, hours, user.level),
      karma: workKarma(kind, hours),
    });
    if (!work) throw new AlreadyWorkingException();
    return {
      active: toWorkDto({ ...work, finished: false }),
      serverTime: work.server_time.toISOString(),
    };
  },

  /** @returns {Promise<boolean>} true — работа отменена (ничего не зачислено) */
  cancel(user) {
    return WorkRepository.cancelActive(user.id);
  },

  /** «Принять оплату»: зачисляет награду завершённой работы. @returns обновлённый пользователь */
  async claim(user) {
    if (!(await WorkRepository.claim(user.id))) throw new NothingToClaimException();
    return UserRepository.findById(user.id);
  },
};
