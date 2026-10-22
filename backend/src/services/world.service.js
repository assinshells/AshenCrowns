import logger from "../config/logger.js";
import { WorldRepository } from "../repositories/world.repository.js";
import { toCityDto, toLocationDto } from "../dto/world.dto.js";
import { CityLockedException, CityNotFoundException } from "../exceptions/auth.exceptions.js";

export const WORLD_SYNC_INTERVAL_MS = 60_000;

export const WorldService = {
  listCities: (level, at) => WorldRepository.listCities(level, at),
  listLocations: (cityId, level, at, quests) => WorldRepository.listLocations(cityId, level, at, quests),
  canAccessCity: (cityId, level, at) => WorldRepository.canAccessCity(cityId, level, at),
  canAccessLocation: (locationId, level, at, quests) =>
    WorldRepository.canAccessLocation(locationId, level, at, quests),

  /**
   * Карта мира для игрока: все города (закрытые — с требуемым уровнем / состоянием события)
   * и текущий город. Уровень берётся из профиля на сервере, не от клиента.
   */
  async getMap(user) {
    const now = new Date();
    const rows = await WorldRepository.listCities(user.level, now);
    const ctx = { currentCityId: user.current_city_id, now };
    return {
      serverTime: now.toISOString(),
      currentCityId: user.current_city_id,
      cities: rows.map((r) => toCityDto(r, ctx)),
    };
  },

  /** Город с локациями. Недоступный город (уровень, событие закрыто) содержимое не раскрывает: 403. */
  async getCity(user, cityId) {
    const now = new Date();
    const row = await WorldRepository.findCity(cityId, user.level, now);
    if (!row) throw new CityNotFoundException();
    if (!row.accessible) throw new CityLockedException();
    // Квестов пока нет: выполненных квестов у игрока нет, локации с required_quest_code остаются закрытыми.
    const locations = await WorldRepository.listLocations(cityId, user.level, now, []);
    return {
      serverTime: now.toISOString(),
      city: toCityDto(row, { currentCityId: user.current_city_id, now }),
      locations: locations.map(toLocationDto),
    };
  },

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
