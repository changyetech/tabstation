import { useState } from 'react';
import { useT } from '../i18n';

export type MoveTarget =
  | { kind: 'window'; windowId: number; label: string }
  | { kind: 'new-maximized' }
  | { kind: 'new-same-size' };

export default function MoveMenu({
  targets,
  onPick,
}: {
  targets: MoveTarget[];
  onPick: (t: MoveTarget) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = (target: MoveTarget) =>
    target.kind === 'window'
      ? target.label
      : target.kind === 'new-maximized'
        ? t('move.newWindowMaximized')
        : t('move.newWindowSameSize');
  return (
    <span className="move-menu">
      <button title={t('tab.moveTo')} onClick={() => setOpen((v) => !v)}>
        {t('tab.moveTo')} ▾
      </button>
      {open && (
        <ul className="move-menu-list">
          {targets.map((target, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  setOpen(false);
                  onPick(target);
                }}
              >
                {label(target)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
