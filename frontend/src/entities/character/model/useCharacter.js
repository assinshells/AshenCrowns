import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import {
  START_ATTRIBUTES,
  START_KARMA,
  deriveStats,
  experienceForLevel,
} from "../lib/formulas.js";

/** Персонаж текущего игрока: характеристики, производные значения, жизни и серебро. */
export function useCharacter() {
  const stats = useSessionStore((s) => s.user?.stats);
  const attributes = stats?.attributes ?? START_ATTRIBUTES;
  const derived = deriveStats(attributes);

  return {
    level: stats?.level ?? 1,
    silver: stats?.silver ?? 0,
    health: stats?.health ?? derived.maxHealth,
    experience: stats?.experience ?? 0,
    experienceToNext: stats?.experienceToNext ?? experienceForLevel(stats?.level ?? 1),
    maxHealth: stats?.maxHealth ?? derived.maxHealth,
    attributes,
    derived,
    karma: stats?.karma ?? START_KARMA,
  };
}
