import { SessionService } from "../services/session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { WorkRepository } from "../repositories/work.repository.js";
import { COOKIE_NAMES } from "../constants/auth.constants.js";
import { CookieProvider } from "../providers/cookie.provider.js";
import { UnauthorizedException } from "../exceptions/auth.exceptions.js";

/**
 * authGuard — единственный источник истины об авторизации.
 * Идентификатор пользователя берётся ТОЛЬКО из серверной сессии (Redis),
 * пользователь перечитывается из БД на каждом запросе. Ни роль, ни email,
 * ни id из тела/заголовков клиента не используются.
 *
 * Перед чтением пользователя зачисляется завершённая работа, поэтому любой запрос
 * видит актуальные серебро и карму (награда не зависит от того, какую страницу открыл игрок).
 */
export const authGuard = async (req, res, next) => {
  const sid = req.cookies?.[COOKIE_NAMES.session];
  const session = sid ? await SessionService.resolve(sid) : null;

  if (!session) {
    if (sid) CookieProvider.clearSession(res);
    return next(new UnauthorizedException());
  }

  await WorkRepository.settleFinished(session.userId);
  const user = await UserRepository.findById(session.userId);
  if (!user) {
    await SessionService.destroy(sid);
    CookieProvider.clearSession(res);
    return next(new UnauthorizedException());
  }

  req.sid = sid;
  req.user = user;
  next();
};
