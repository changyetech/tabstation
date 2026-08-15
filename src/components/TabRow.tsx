import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TabWithId } from '../lib/dedupe';
import { hostnameOf } from '../lib/grouping';
import { useLanguage, useT } from '../i18n';
import { lastAccessedDisplay } from '../lib/time';
import MoveMenu, { type MoveTarget } from './MoveMenu';

export interface TabRowProps {
  tab: TabWithId;
  dupCount?: number;
  draggable: boolean;
  now: number;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onClose: (tab: TabWithId) => void;
  getMoveTargets?: (tab: TabWithId) => MoveTarget[];
  onMove?: (tab: TabWithId, target: MoveTarget) => void;
}

export default function TabRow({
  tab,
  dupCount,
  draggable,
  now,
  registerRow,
  onClose,
  getMoveTargets,
  onMove,
}: TabRowProps) {
  const t = useT();
  const lang = useLanguage();

  // pinned 不可拖（spec §5.2）
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tab.id,
    disabled: !draggable || tab.pinned,
    data: { tabId: tab.id, windowId: tab.windowId, index: tab.index },
  });

  const display = lastAccessedDisplay(tab.lastAccessed, now);
  const timeText =
    display.kind === 'missing'
      ? '—'
      : display.kind === 'justNow'
        ? t('time.justNow')
        : new Intl.RelativeTimeFormat(lang).format(-display.value, display.unit);

  const activate = async () => {
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id, { active: true });
  };

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        registerRow(tab.id, el);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="tab-row"
      {...attributes}
      {...listeners}
    >
      {tab.favIconUrl ? (
        <img className="favicon" src={tab.favIconUrl} alt="" />
      ) : (
        <span className="favicon favicon-placeholder" />
      )}
      {tab.pinned && <span className="pin">📌</span>}
      <span className="title">{tab.title}</span>
      <span className="domain">{hostnameOf(tab.url)}</span>
      <span className="time">{timeText}</span>
      {dupCount !== undefined && (
        <span className="dup-badge">{t('dup.badge', { n: dupCount })}</span>
      )}
      <span className="actions">
        <button title={t('tab.activate')} onClick={() => void activate()}>
          ↗
        </button>
        {!tab.pinned && getMoveTargets && onMove && (
          <MoveMenu targets={getMoveTargets(tab)} onPick={(target) => onMove(tab, target)} />
        )}
        <button title={t('tab.close')} onClick={() => onClose(tab)}>
          ✕
        </button>
      </span>
    </li>
  );
}
