import { Block } from "./Block.jsx";

/**
 * Блок-заглушка будущего содержимого.
 * long — вытянутый блок (больше вертикальных отступов).
 */
export function PlaceholderBlock({ title, long = false, className = "" }) {
  return (
    <Block title={title} long={long} className={className}>
      <p className="card-text text-body-secondary mb-0">Заглушка</p>
    </Block>
  );
}
