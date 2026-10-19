import { Coins, Gem, Heart } from "lucide-react";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";

/**
 * Параметры игрока: жизни, опыт (с уровнем слева), серебро, рубины.
 * Значения приходят с сервера в профиле (GET /api/auth/me → user.stats).
 */
export function GameStats() {
  const stats = useSessionStore((s) => s.user?.stats);
  if (!stats) return null;

  const { level, health, maxHealth, experience, experienceToNext, silver, rubies } = stats;

  return (
    <ul className="list-unstyled d-flex flex-wrap align-items-center column-gap-3 row-gap-1 mb-0 small" aria-label="Параметры игрока">
      <li className="d-flex align-items-center gap-1" title="Жизни" aria-label={`Жизни: ${health} из ${maxHealth}`}>
        <Heart size={16} className="text-danger" aria-hidden="true" />
        <span>{health}/{maxHealth}</span>
      </li>
      <li className="d-flex align-items-center gap-2" title="Опыт" aria-label={`Уровень ${level}, опыт: ${experience} из ${experienceToNext}`}>
        <span className="fw-semibold">Уровень {level}</span>
        <progress className="game-xp" max={experienceToNext} value={experience} aria-hidden="true" />
        <span>{experience}/{experienceToNext}</span>
      </li>
      <li className="d-flex align-items-center gap-1" title="Серебро" aria-label={`Серебро: ${silver}`}>
        <Coins size={16} className="text-secondary" aria-hidden="true" />
        <span>{silver}</span>
      </li>
      <li className="d-flex align-items-center gap-1" title="Рубины" aria-label={`Рубины: ${rubies}`}>
        <Gem size={16} className="text-info" aria-hidden="true" />
        <span>{rubies}</span>
      </li>
    </ul>
  );
}
