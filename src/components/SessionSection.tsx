import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage, useT } from '../i18n';
import { foldTabs } from '../lib/fold';
import { hostnameOf } from '../lib/grouping';
import type { SavedSession, SessionTab, Settings } from '../lib/storage';
import Favicon from './Favicon';
import { Icon } from './icons';

export interface SessionSectionProps {
  sessions: SavedSession[];
  visibleLimit: Settings['visibleTabs'];
  expandedKeys: ReadonlySet<string>;
  onToggleExpand: (key: string) => void;
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
  onOpenTabNewWindow: (tab: SessionTab) => void;
}

// 会话条目行：同会话内可拖拽排序（沿用旧 spec §5.5）
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
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `${sessionId}:${index}`,
    data: { index },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="session-tab-row"
      {...attributes}
      {...listeners}
    >
      <Favicon url={tab.url} favIconUrl={tab.favIconUrl} />
      <span className="rl-text">
        <button className="session-tab-title" title={t('sessions.openTab')} onClick={onOpen}>
          {tab.title}
        </button>
        <span className="rl-url">{tab.url.replace(/^https?:\/\//, '')}</span>
      </span>
      <span className="st-acts">
        <button className="icon-btn" title={t('sessions.tabNewWindow')} onClick={onOpenNewWindow}>
          <Icon name="winNew" size={13} />
        </button>
        <button className="icon-btn danger" title={t('sessions.removeTab')} onClick={onDelete}>
          <Icon name="close" size={13} />
        </button>
      </span>
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
  onReorderTab,
  onDeleteTab,
  onOpenTab,
  onOpenTabNewWindow,
}: {
  session: SavedSession;
} & Omit<SessionSectionProps, 'sessions'>) {
  const t = useT();
  const lang = useLanguage();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.name);

  // 整行是拖拽把手，需位移阈值，否则行内按钮的 pointerdown 会被判成起拖（同 App.tsx）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const commitRename = () => {
    setRenaming(false);
    if (draft.trim() && draft !== session.name) onRename(session, draft.trim());
  };

  const handleDragEnd = (e: DragEndEvent) => {
    // data.current 的类型是 dnd-kit 定死的 Record<string, any>，属库边界；
    // 这里的具体形状由 SessionTabRow 的 useSortable({ data }) 保证
    const from = (e.active.data.current as { index: number }).index;
    const to = (e.over?.data.current as { index: number } | undefined)?.index;
    if (to !== undefined && from !== to) onReorderTab(session, from, to);
  };

  // 会话时间戳照稿：M/D HH:mm 保存
  const metaTime = new Intl.DateTimeFormat(lang, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(session.createdAt);

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
        <span className="win-meta num">
          {t('sessions.meta', { n: session.tabs.length, time: metaTime })}
        </span>
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
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
      </DndContext>
    </section>
  );
}

// 已保存会话（spec §5.5 2026-08-16 修订）：主区第三模式，逐会话卡片；无会话时空态
export default function SessionSection({ sessions, ...rest }: SessionSectionProps) {
  const t = useT();
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
    <div className="win-flow">
      {sessions.map((s) => (
        <SessionBlock key={s.id} session={s} {...rest} />
      ))}
    </div>
  );
}
