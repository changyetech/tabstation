import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useT } from '../i18n';
import type { SavedSession, SessionTab } from '../lib/storage';

export interface SessionSectionProps {
  sessions: SavedSession[];
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}

// 会话条目行：同会话内可拖拽排序（spec §5.5）
function SessionTabRow({
  sessionId,
  tab,
  index,
  onDelete,
  onOpen,
}: {
  sessionId: string;
  tab: SessionTab;
  index: number;
  onDelete: () => void;
  onOpen: () => void;
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
      {tab.favIconUrl ? (
        <img className="favicon" src={tab.favIconUrl} alt="" />
      ) : (
        <span className="favicon favicon-placeholder" />
      )}
      {tab.pinned && <span className="pin">📌</span>}
      <button className="session-tab-title" onClick={onOpen}>
        {tab.title}
      </button>
      <button className="session-tab-delete" title={t('sessions.delete')} onClick={onDelete}>
        ✕
      </button>
    </li>
  );
}

interface SessionRowProps {
  session: SavedSession;
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}

function SessionRow({
  session,
  onRestore,
  onDelete,
  onRename,
  onReorderTab,
  onDeleteTab,
  onOpenTab,
}: SessionRowProps) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.name);

  // 整行是拖拽把手，需位移阈值，否则行内「标题」「✕」按钮的 pointerdown 会被判成起拖（同 App.tsx）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const commitRename = () => {
    setRenaming(false);
    if (draft.trim() && draft !== session.name) onRename(session, draft.trim());
  };

  // 拖拽结束 → 条目重排（即时落盘由 App 保证）
  const handleDragEnd = (e: DragEndEvent) => {
    // data.current 的类型是 dnd-kit 定死的 Record<string, any>，属库边界；
    // 这里的具体形状由 SessionTabRow 的 useSortable({ data }) 保证
    const from = (e.active.data.current as { index: number }).index;
    const to = (e.over?.data.current as { index: number } | undefined)?.index;
    if (to !== undefined && from !== to) onReorderTab(session, from, to);
  };

  return (
    <li className="session-row-wrap">
      <details>
        <summary className="session-row">
          {renaming ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <span className="session-name">{session.name}</span>
          )}
          <span className="session-count">
            ({t('window.tabCount', { n: session.tabs.length })})
          </span>
          <button
            title={t('sessions.rename')}
            onClick={(e) => {
              e.preventDefault();
              setRenaming(true);
              setDraft(session.name);
            }}
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onRestore(session);
            }}
          >
            {t('sessions.open')}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete(session);
            }}
          >
            {t('sessions.delete')}
          </button>
        </summary>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={session.tabs.map((_, i) => `${session.id}:${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="session-tab-list">
              {session.tabs.map((tab, i) => (
                <SessionTabRow
                  key={`${session.id}:${i}`}
                  sessionId={session.id}
                  tab={tab}
                  index={i}
                  onDelete={() => onDeleteTab(session, i)}
                  onOpen={() => onOpenTab(tab)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </details>
    </li>
  );
}

// 已保存会话分区（spec §4.3/§5.5）：可折叠；模板式，恢复不消耗
export default function SessionSection({ sessions, ...handlers }: SessionSectionProps) {
  const t = useT();
  if (sessions.length === 0) return null;
  return (
    <details open className="session-section">
      <summary>💾 {t('sessions.title')}</summary>
      <ul className="session-list">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} {...handlers} />
        ))}
      </ul>
    </details>
  );
}
