import { useRef } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TabWithId } from '../lib/dedupe';
import { useT } from '../i18n';
import type { View } from './Toolbar';
import type { MoveTarget } from './MoveMenu';
import DomainGroupList from './DomainGroupList';
import TabRow from './TabRow';

export interface WindowSectionProps {
  window: chrome.windows.Window;
  windowNumber: number;
  tabs: TabWithId[];
  isCurrent: boolean;
  draggable: boolean;
  view: View;
  dupCountByTabId: Map<number, number>;
  now: number;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: TabWithId) => void;
  getMoveTargets?: (tab: TabWithId) => MoveTarget[];
  onMove?: (tab: TabWithId, target: MoveTarget) => void;
  onCloseWindow?: (win: chrome.windows.Window, sectionEl: HTMLElement | null) => void;
}

export default function WindowSection({
  window: win,
  windowNumber,
  tabs,
  isCurrent,
  draggable,
  view,
  dupCountByTabId,
  now,
  registerRow,
  onCloseTab,
  getMoveTargets,
  onMove,
  onCloseWindow,
}: WindowSectionProps) {
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);
  // 窗口标识：序号 + 活动 tab 标题 + tab 数（spec §4.3）
  const activeTitle = tabs.find((x) => x.active)?.title ?? tabs[0]?.title ?? '';
  const label = `${t('window.label', { n: windowNumber })}${isCurrent ? t('window.current') : ''} · ${activeTitle} (${t('window.tabCount', { n: tabs.length })})`;

  return (
    <section className="window-section" data-window-id={win.id} ref={sectionRef}>
      <header className="window-header">
        <h2>{label}</h2>
        {onCloseWindow && (
          <button
            className="window-close"
            onClick={() => {
              // 轻确认（spec §4.3）：{name} 只用「窗口 N」，不带活动标题/tab 数（R1）
              if (
                !window.confirm(
                  t('window.closeConfirm', {
                    name: t('window.label', { n: windowNumber }),
                    n: tabs.length,
                  }),
                )
              )
                return;
              onCloseWindow(win, sectionRef.current);
            }}
          >
            ✕ {t('window.close')}
          </button>
        )}
      </header>
      {view === 'domain' ? (
        <DomainGroupList
          tabs={tabs}
          now={now}
          dupCountByTabId={dupCountByTabId}
          registerRow={registerRow}
          onCloseTab={onCloseTab}
          getMoveTargets={getMoveTargets}
          onMove={onMove}
        />
      ) : (
        <SortableContext items={tabs.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <ul className="tab-list">
            {tabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                dupCount={dupCountByTabId.get(tab.id)}
                draggable={draggable}
                now={now}
                registerRow={registerRow}
                onClose={onCloseTab}
                getMoveTargets={getMoveTargets}
                onMove={onMove}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </section>
  );
}
