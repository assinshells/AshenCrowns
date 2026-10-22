import logger from "../config/logger.js";
import { WorldRepository } from "../repositories/world.repository.js";

export const WORLD_SYNC_INTERVAL_MS = 60_000;

export const WorldService = {
  /** Города с признаком доступности для уровня персонажа (закрытый город событий остаётся в списке). */
  listCities: (level, at) => WorldRepository.listCities(level, at),
  listLocations: (cityId) => WorldRepository.listLocations(cityId),
  canAccessCity: (cityId, level, at) => WorldRepository.canAccessCity(cityId, level, at),
  canAccessLocation: (locationId, level, at, quests) =>
    WorldRepository.canAccessLocation(locationId, level, at, quests),

  /** Синхронизирует статусы и историю запусков событий; доступность от неё не зависит (считается по времени). */
  async syncEvents(now) {
    const res = await WorldRepository.syncEvents(now);
    if (res.opened || res.closed) logger.info(`World events synced: opened=${res.opened}, closed=${res.closed}`);
    return res;
  },

  /** Запуск фоновой синхронизации; возвращает функцию остановки. */
  startEventScheduler() {
    const tick = () => this.syncEvents().catch((err) => logger.error(`World events sync failed: ${err.message}`));
    tick();
    const timer = setInterval(tick, WORLD_SYNC_INTERVAL_MS);
    timer.unref();
    return () => clearInterval(timer);
  },
};
