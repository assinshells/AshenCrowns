import { Coins, Moon, Sun } from "lucide-react";

/** Серебро: иконка и сумма. */
export function SilverValue({ amount }) {
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <Coins size={16} className="text-secondary" aria-hidden="true" />
      <span>{amount}</span>
    </span>
  );
}

/** Карма: солнце — светлая, луна — тёмная. type: "light" | "dark". */
export function KarmaValue({ type, amount }) {
  const Icon = type === "light" ? Sun : Moon;
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <Icon size={16} className={type === "light" ? "text-warning" : "text-primary"} aria-hidden="true" />
      <span>{amount}</span>
    </span>
  );
}
