import { UserRepository } from "../repositories/user.repository.js";
import { InsufficientSilverException } from "../exceptions/auth.exceptions.js";

export const CharacterService = {
  /**
   * Повышает характеристику игрока на 1 за серебро.
   * Баланс и цена проверяются в БД в том же UPDATE (см. UserRepository.upgradeAttribute),
   * цена и значения от клиента не принимаются — только имя характеристики.
   */
  async upgradeAttribute(user, attribute) {
    const updated = await UserRepository.upgradeAttribute(user.id, attribute);
    if (!updated) throw new InsufficientSilverException();
    return updated;
  },
};
