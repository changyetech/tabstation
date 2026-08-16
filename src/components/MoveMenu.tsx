import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { Icon } from './icons';

// 移动目标只列其他窗口（设计稿 move-menu）；新窗口走独立的「拆到新窗口」按钮
export interface MoveTarget {
  windowId: number;
  label: string;
  tabCount: number;
}

export default function MoveMenu({
  targets,
  onPick,
}: {
  targets: MoveTarget[];
  onPick: (t: MoveTarget) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  // 点击外部 / Esc 关闭（设计稿 popover 行为）
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="move-menu" ref={rootRef}>
      <button
        className="icon-btn"
        title={t('tab.moveTo')}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Icon name="move" size={13} />
      </button>
      {open && (
        <ul className="popover">
          <li className="popover-label">{t('move.title')}</li>
          {targets.map((target) => (
            <li key={target.windowId}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onPick(target);
                }}
              >
                <Icon name="win" size={13} />
                {target.label}
                <span className="sub num">{t('window.tabCount', { n: target.tabCount })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
