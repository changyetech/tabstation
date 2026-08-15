import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TabWithId } from '../lib/dedupe';
import { useT } from '../i18n';
import { groupByDomain } from '../lib/grouping';
import TabRow from './TabRow';

export interface DomainGroupListProps {
  tabs: TabWithId[];
  now: number;
  dupCountByTabId: Map<number, number>;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: TabWithId) => void;
}

// 域名视图（spec §5.7）：按 hostname 聚合、tab 数降序、组可折叠、只读（不可拖拽）
export default function DomainGroupList({
  tabs,
  now,
  dupCountByTabId,
  registerRow,
  onCloseTab,
}: DomainGroupListProps) {
  const t = useT();
  const label = (key: string) =>
    key === '#chrome'
      ? 'chrome'
      : key === '#file'
        ? t('domain.localFiles')
        : key === '#other'
          ? t('domain.other')
          : key;

  return (
    <div className="domain-groups">
      {groupByDomain(tabs).map((g) => (
        <details key={g.key} open role="group" className="domain-group">
          <summary>
            {label(g.key)} ({g.tabs.length})
          </summary>
          <SortableContext items={g.tabs.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <ul className="tab-list">
              {g.tabs.map((tab) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  now={now}
                  dupCount={dupCountByTabId.get(tab.id)}
                  draggable={false}
                  registerRow={registerRow}
                  onClose={onCloseTab}
                />
              ))}
            </ul>
          </SortableContext>
        </details>
      ))}
    </div>
  );
}
