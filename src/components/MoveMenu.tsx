import TooltipButton from './TooltipButton';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { Icon } from './icons';

// 移动目标只列其他窗口（设计稿 move-menu）；新窗口走独立的「拆到新窗口」按钮
export interface MoveTarget {
  windowId: number;
  label: string;
  tabCount: number;
}

type AnchorRect = Pick<DOMRect, 'top' | 'bottom' | 'right'>;
type PopoverPosition = { top: number; right: number; maxHeight: number; overflowY: 'auto' };

const POPOVER_OFFSET_PX = 6;
const VIEWPORT_MARGIN_PX = 8;

export default function MoveMenu({
  targets,
  onPick,
}: {
  targets: MoveTarget[];
  onPick: (t: MoveTarget) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLUListElement>(null);

  // 点击外部 / Esc 关闭（设计稿 popover 行为）
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const isInsideMenu =
        rootRef.current?.contains(target) || popoverRef.current?.contains(target);
      if (!isInsideMenu) setOpen(false);
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

  // 卡片为保留拖拽视觉使用 overflow:hidden；弹层必须出卡片并以视口坐标锚定。
  useLayoutEffect(() => {
    if (!open || !anchorRect) return;

    const positionPopover = () => {
      const popover = popoverRef.current;
      if (!popover) return;

      const rect = triggerRef.current?.getBoundingClientRect() ?? anchorRect;
      const maxHeight = Math.max(0, window.innerHeight - 2 * VIEWPORT_MARGIN_PX);
      // 视口增高时先解除旧限高，再测量；否则定位仍用旧高度而菜单随后长高越界。
      popover.style.maxHeight = `${maxHeight}px`;
      const height = Math.min(popover.offsetHeight, maxHeight);
      const belowTop = rect.bottom + POPOVER_OFFSET_PX;
      const aboveTop = rect.top - POPOVER_OFFSET_PX - height;
      const canShowBelow = belowTop + height <= window.innerHeight - VIEWPORT_MARGIN_PX;
      const preferredTop = canShowBelow || aboveTop < VIEWPORT_MARGIN_PX ? belowTop : aboveTop;
      const top = Math.max(
        VIEWPORT_MARGIN_PX,
        Math.min(preferredTop, window.innerHeight - height - VIEWPORT_MARGIN_PX),
      );
      const right = window.innerWidth - rect.right;

      setPopoverPosition((previous) =>
        previous?.top === top && previous.right === right && previous.maxHeight === maxHeight
          ? previous
          : { top, right, maxHeight, overflowY: 'auto' },
      );
    };

    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [open, anchorRect]);

  const openPopover = (trigger: HTMLButtonElement) => {
    const rect = trigger.getBoundingClientRect();
    setAnchorRect({ top: rect.top, bottom: rect.bottom, right: rect.right });
    setOpen(true);
  };

  return (
    <span className="move-menu" ref={rootRef}>
      <TooltipButton
        className="icon-btn"
        title={t('tab.moveTo')}
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openPopover(e.currentTarget);
        }}
      >
        <Icon name="move" size={13} />
      </TooltipButton>
      {open &&
        createPortal(
          <ul
            className="popover"
            ref={popoverRef}
            style={
              popoverPosition ?? {
                top: 0,
                right: 0,
                visibility: 'hidden',
              }
            }
          >
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
          </ul>,
          document.body,
        )}
    </span>
  );
}
