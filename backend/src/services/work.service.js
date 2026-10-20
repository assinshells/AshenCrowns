import { WorkRepository } from "../repositories/work.repository.js";
import { AlreadyWorkingException } from "../exceptions/auth.exceptions.js";
import { workCatalog, workKarma, workSilver } from "../constants/work.constants.js";

const toWorkDto = (w) =>
  w && {
    id: Number(w.id),
    kind: w.kind,
    hours: w.hours,
    silver: w.silver,
    karma: w.karma, // > 0 светлая, < 0 тёмная
    status: w.status,
    startedAt: w.started_at.toISOString(),
    endsAt: w.ends_at.toISOString(),
  };

export const WorkService = {
  /**
   * Каталог наград + активная работа + последняя завершённая (чтобы клиент, дождавшись конца,
   * показал результат). serverTime — серверные часы: клиент считает прогресс по ним.
   * Завершённые работы уже зачислены в authGuard.
   */
  async getState(user) {
    const [active, last] = await Promise.all([
      WorkRepository.findActive(user.id),
      WorkRepository.findLastFinished(user.id),
    ]);
    const serverTime = active?.server_time ?? (await WorkRepository.serverTime());
    return {
      jobs: workCatalog(user.level),
      active: toWorkDto(active),
      last: toWorkDto(last),
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
    return { active: toWorkDto(work), serverTime: work.server_time.toISOString() };
  },

  /** @returns {Promise<boolean>} true — работа отменена (ничего не зачислено) */
  cancel(user) {
    return WorkRepository.cancelActive(user.id);
  },
};
