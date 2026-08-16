import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useT } from '../i18n';
import {
  cardDropCollision,
  isCrossCardOver,
  sessionDragEndToMove,
  type SessionDragData,
} from '../lib/dnd';
import { foldTabs } from '../lib/fold';
import { hostnameOf } from '../lib/grouping';
import type { SavedSession, SessionTab, Settings } from '../lib/storage';
import DragGhost from './DragGhost';
import Favicon from './Favicon';
import { GripIcon, Icon } from './icons';

export interface SessionSectionProps {
  sessions: SavedSession[];
  visibleLimit: Settings['visibleTabs'];
  expandedKeys: ReadonlySet<string>;
  onToggleExpand: (key: string) => void;
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onMoveTab: (
    fromSessionId: string,
    fromIndex: number,
    toSessionId: string,
    toIndex: number,
  ) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
  onOpenTabNewWindow: (tab: SessionTab) => void;
}

// 会话条目行：markup 对齐 TabRow（tab-row/tab-line），复用既有 CSS；
// 整行可点 = 当前窗口打开（模板式，条目保留）；pinned 不可拖（对齐 by windows）
function SessionTabRow({
  sessionId,
  tab,
  index,
  onDelete,
  onOpen,
  onOpenNewWindow,
}: {
  sessionId: string;
  tab: SessionTab;
  index: number;
  onDelete: () => void;
  onOpen: () => void;
  onOpenNewWindow: () => void;
}) {
  const t = useT();
  // pinned 仅禁拖不禁落（spec §3.4）：保持 droppable，悬停 pinned 行时落点指示不漂移
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } =
    useSortable({
      id: `${sessionId}:${index}`,
      disabled: { draggable: Boolean(tab.pinned), droppable: false },
      data: { sessionId, index },
    });
  // 跨会话悬停 → 插入指示线（spec §3.4）
  const dropTarget = isCrossCardOver(
    isOver,
    (active?.data.current as SessionDragData | undefined)?.sessionId,
    sessionId,
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`tab-row${isDragging ? ' dragging' : ''}${dropTarget ? ' drop-target' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className="tab-line"
        role="button"
        tabIndex={0}
        title={`${tab.title} · ${t('sessions.openTab')}`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          e.preventDefault();
          onOpen();
        }}
      >
        <span className={`drag-grip${tab.pinned ? ' ghost' : ''}`} title={t('tab.drag')}>
          <GripIcon />
        </span>
        <Favicon url={tab.url} favIconUrl={tab.favIconUrl} />
        {tab.pinned && (
          <span className="tab-pin" title={t('tab.pinned')}>
            <Icon name="pin" size={12} />
          </span>
        )}
        <span className="tab-title">{tab.title}</span>
        <span className="tab-host">{hostnameOf(tab.url)}</span>
        <span className="row-spacer" />
        <span className="row-acts">
          <button
            className="icon-btn"
            title={t('sessions.tabNewWindow')}
            onClick={(e) => {
              e.stopPropagation();
              onOpenNewWindow();
            }}
          >
            <Icon name="winNew" size={13} />
          </button>
          <button
            className="icon-btn danger"
            title={t('sessions.removeTab')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      </div>
    </li>
  );
}

// 会话卡片（spec §5.5 2026-08-16 修订）：与窗口区块同款 win-block 样式，条目平铺无折叠箭头
function SessionBlock({
  session,
  visibleLimit,
  expandedKeys,
  onToggleExpand,
  onRestore,
  onDelete,
  onRename,
  onDeleteTab,
  onOpenTab,
  onOpenTabNewWindow,
}: {
  session: SavedSession;
} & Omit<SessionSectionProps, 'sessions' | 'onMoveTab'>) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.name);

  const commitRename = () => {
    setRenaming(false);
    if (draft.trim() && draft !== session.name) onRename(session, draft.trim());
  };

  // favicon 叠层：按域名去重后最多 4 个（同窗口区块头）
  const stackKeys = new Set<string>();
  const stack: SessionTab[] = [];
  for (const tab of session.tabs) {
    const key = hostnameOf(tab.url);
    if (stackKeys.has(key)) continue;
    stackKeys.add(key);
    stack.push(tab);
    if (stack.length >= 4) break;
  }

  const foldKey = `s${session.id}`;
  const fold = foldTabs(session.tabs, visibleLimit, expandedKeys.has(foldKey));

  return (
    <section className="win-block session-block">
      <div className="win-head">
        {renaming ? (
          <input
            className="session-name-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(session.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <span className="win-title">{session.name}</span>
        )}
        <span className="fav-stack">
          {stack.map((tab) => (
            <Favicon key={tab.url} url={tab.url} favIconUrl={tab.favIconUrl} />
          ))}
        </span>
        <span className="win-meta num">{t('window.tabCount', { n: session.tabs.length })}</span>
        <span className="win-acts">
          <button
            className="ghost-btn"
            title={t('sessions.restore')}
            onClick={() => onRestore(session)}
          >
            <Icon name="restore" size={13} />
            {t('sessions.restoreShort')}
          </button>
          <button
            className="ghost-btn"
            title={t('sessions.rename')}
            onClick={() => {
              setRenaming(true);
              setDraft(session.name);
            }}
          >
            <Icon name="edit" size={13} />
            {t('sessions.rename')}
          </button>
          <button
            className="ghost-btn danger"
            title={t('sessions.delete')}
            onClick={() => onDelete(session)}
          >
            <Icon name="trash" size={13} />
            {t('sessions.delete')}
          </button>
        </span>
      </div>
      <SortableContext
        items={fold.shown.map((_, i) => `${session.id}:${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="tab-list">
          {fold.shown.map((tab, i) => (
            <SessionTabRow
              key={`${session.id}:${i}`}
              sessionId={session.id}
              tab={tab}
              index={i}
              onDelete={() => onDeleteTab(session, i)}
              onOpen={() => onOpenTab(tab)}
              onOpenNewWindow={() => onOpenTabNewWindow(tab)}
            />
          ))}
          {fold.hiddenCount > 0 && (
            <li className="more-row">
              <button className="more-btn num" onClick={() => onToggleExpand(foldKey)}>
                {fold.expanded ? t('more.collapse') : t('more.expand', { n: fold.hiddenCount })}
              </button>
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

// 已保存会话：一个 DndContext 包住全部卡片（与 by windows 的 App 层结构同构）→ 跨会话拖拽成立
export default function SessionSection({ sessions, onMoveTab, ...rest }: SessionSectionProps) {
  const t = useT();
  // 整行是拖拽把手，需位移阈值，否则行内按钮的 pointerdown 会被判成起拖（同 App.tsx）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  // 拖影内容（spec §3.4）：卡片 overflow:hidden 会裁剪原行，改用 DragOverlay portal 渲染
  const [ghost, setGhost] = useState<SessionTab | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as SessionDragData | undefined;
    if (!data) return;
    setGhost(sessions.find((s) => s.id === data.sessionId)?.tabs[data.index] ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setGhost(null);
    // data.current 的类型是 dnd-kit 定死的 Record<string, any>，属库边界；
    // 这里的具体形状由 SessionTabRow 的 useSortable({ data }) 保证
    const move = sessionDragEndToMove(
      e.active.data.current as SessionDragData,
      (e.over?.data.current as SessionDragData | undefined) ?? null,
    );
    if (move) onMoveTab(move.fromSessionId, move.fromIndex, move.toSessionId, move.toIndex);
  };

  if (sessions.length === 0) {
    return (
      <div className="empty-all">
        <span className="icon">
          <Icon name="save" size={16} />
        </span>
        <br />
        {t('sessions.empty')}
      </div>
    );
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={cardDropCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setGhost(null)}
    >
      <div className="win-flow">
        {sessions.map((s) => (
          <SessionBlock key={s.id} session={s} {...rest} />
        ))}
      </div>
      <DragOverlay>
        {ghost && <DragGhost title={ghost.title} url={ghost.url} favIconUrl={ghost.favIconUrl} />}
      </DragOverlay>
    </DndContext>
  );
}
