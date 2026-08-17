import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TabWithId } from '../lib/dedupe';
import { isCrossCardOver, type DragTabData } from '../lib/dnd';
import { hostnameOf } from '../lib/grouping';
import { useLanguage, useT } from '../i18n';
import Favicon from './Favicon';
import { formatRelative, lastAccessedDisplay } from '../lib/time';
import { GripIcon, Icon } from './icons';
import MoveMenu, { type MoveTarget } from './MoveMenu';

export interface TabRowProps {
  tab: TabWithId;
  dupCount?: number;
  dupPreview?: 'keep' | 'close';
  draggable: boolean;
  /** 两行样式（域名视图）：标题 + URL 子标题，隐藏域名列 */
  subUrl?: boolean;
  /** 不显示行内 favicon（域名视图：图标仅在域名头，spec §5.1） */
  noFav?: boolean;
  now: number;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onClose: (tab: TabWithId) => void;
  getMoveTargets?: (tab: TabWithId) => MoveTarget[];
  onMove?: (tab: TabWithId, target: MoveTarget) => void;
  onReadLater?: (tab: TabWithId) => void;
  onSplit?: (tab: TabWithId) => void;
  /** 悬停重复行 → 上报以高亮同组（spec §5.4）；离开上报 null */
  onHoverDup?: (tabId: number | null) => void;
}

export default function TabRow({
  tab,
  dupCount,
  dupPreview,
  draggable,
  subUrl,
  noFav,
  now,
  registerRow,
  onClose,
  getMoveTargets,
  onMove,
  onReadLater,
  onSplit,
  onHoverDup,
}: TabRowProps) {
  const t = useT();
  const lang = useLanguage();

  // pinned 不可拖（spec 沿用旧 §5.2）；但保持 droppable（spec §3.4）：
  // 否则碰撞检测会跳过 pinned 行，悬停其上时指示与落点漂到别的行
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } =
    useSortable({
      id: tab.id,
      disabled: { draggable: !draggable || Boolean(tab.pinned), droppable: false },
      data: { tabId: tab.id, windowId: tab.windowId, index: tab.index },
    });
  // 跨窗口悬停 → 插入指示线（spec 2026-08-16-session-card-dnd §3.4）
  const dropTarget = isCrossCardOver(
    isOver,
    (active?.data.current as DragTabData | undefined)?.windowId,
    tab.windowId,
  );

  const display = lastAccessedDisplay(tab.lastAccessed, now);
  const timeText =
    display.kind === 'missing'
      ? '—'
      : display.kind === 'justNow'
        ? t('time.justNow')
        : formatRelative(lang, display.value, display.unit);

  const activate = async () => {
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
  };

  const previewClass =
    dupPreview === 'close' ? ' dup-doomed' : dupPreview === 'keep' ? ' dup-keep' : '';
  const host = hostnameOf(tab.url);
  const moveTargets = getMoveTargets && onMove ? getMoveTargets(tab) : [];

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        registerRow(tab.id, el);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`tab-row${previewClass}${isDragging ? ' dragging' : ''}${dropTarget ? ' drop-target' : ''}`}
      onMouseEnter={dupCount !== undefined ? () => onHoverDup?.(tab.id) : undefined}
      onMouseLeave={dupCount !== undefined ? () => onHoverDup?.(null) : undefined}
      {...attributes}
      {...listeners}
    >
      {/* 整行可点 = 跳转；Enter/空格 键盘等效（设计稿 tab-line） */}
      <div
        className="tab-line"
        role="button"
        tabIndex={0}
        title={`${tab.title ?? ''} · ${t('tab.activate')}`}
        onClick={() => void activate()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          e.preventDefault();
          void activate();
        }}
      >
        {draggable && (
          <span className={`drag-grip${tab.pinned ? ' ghost' : ''}`} title={t('tab.drag')}>
            <GripIcon />
          </span>
        )}
        {!noFav && <Favicon url={tab.url} favIconUrl={tab.favIconUrl} />}
        {tab.pinned && (
          <span className="tab-pin" title={t('tab.pinned')}>
            <Icon name="pin" size={12} />
          </span>
        )}
        {subUrl ? (
          <span className="tab-text">
            <span className="tab-title">{tab.title}</span>
            <span className="tab-url">{(tab.url ?? '').replace(/^https?:\/\//, '')}</span>
          </span>
        ) : (
          <>
            <span className="tab-title">{tab.title}</span>
            <span className="tab-host">{host}</span>
            <span className="row-spacer" />
          </>
        )}
        {dupCount !== undefined && (
          <span className="dup-badge num">{t('dup.badge', { n: dupCount })}</span>
        )}
        <span className="tab-time num">{timeText}</span>
        <span className="row-acts">
          {/* 稍后阅读仅 http(s)、非 pinned（沿用旧 spec §5.4） */}
          {onReadLater && !tab.pinned && /^https?:\/\//.test(tab.url ?? '') && (
            <button
              className="icon-btn"
              title={t('tab.readLater')}
              onClick={(e) => {
                e.stopPropagation();
                onReadLater(tab);
              }}
            >
              <Icon name="bookAdd" size={13} />
            </button>
          )}
          {onSplit && !tab.pinned && (
            <button
              className="icon-btn"
              title={t('tab.split')}
              onClick={(e) => {
                e.stopPropagation();
                onSplit(tab);
              }}
            >
              <Icon name="winNew" size={13} />
            </button>
          )}
          {moveTargets.length > 0 && onMove && (
            <MoveMenu targets={moveTargets} onPick={(target) => onMove(tab, target)} />
          )}
          <button
            className="icon-btn danger"
            title={t('tab.close')}
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab);
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      </div>
    </li>
  );
}
