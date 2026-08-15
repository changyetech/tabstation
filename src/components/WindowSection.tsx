import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TabWithId } from '../lib/dedupe';
import { useT } from '../i18n';
import TabRow from './TabRow';

export interface WindowSectionProps {
  window: chrome.windows.Window;
  windowNumber: number;
  tabs: TabWithId[];
  isCurrent: boolean;
  draggable: boolean;
  dupCountByTabId: Map<number, number>;
  now: number;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: TabWithId) => void;
}

export default function WindowSection({
  window: win,
  windowNumber,
  tabs,
  isCurrent,
  draggable,
  dupCountByTabId,
  now,
  registerRow,
  onCloseTab,
}: WindowSectionProps) {
  const t = useT();
  // 窗口标识：序号 + 活动 tab 标题 + tab 数（spec §4.3）
  const activeTitle = tabs.find((x) => x.active)?.title ?? tabs[0]?.title ?? '';
  const label = `${t('window.label', { n: windowNumber })}${isCurrent ? t('window.current') : ''} · ${activeTitle} (${t('window.tabCount', { n: tabs.length })})`;

  return (
    <section className="window-section" data-window-id={win.id}>
      <header className="window-header">
        <h2>{label}</h2>
      </header>
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
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}
