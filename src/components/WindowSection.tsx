import { useRef } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TabWithId } from '../lib/dedupe';
import { useT } from '../i18n';
import { hostnameOf } from '../lib/grouping';
import { foldTabs } from '../lib/fold';
import type { Settings } from '../lib/storage';
import type { MoveTarget } from './MoveMenu';
import { Icon } from './icons';
import Favicon from './Favicon';
import TabRow from './TabRow';

export interface WindowSectionProps {
  window: chrome.windows.Window;
  windowNumber: number;
  tabs: TabWithId[];
  isCurrent: boolean;
  draggable: boolean;
  dupCountByTabId: Map<number, number>;
  previewByTabId: Map<number, 'keep' | 'close'>;
  dedupePreview: boolean;
  visibleLimit: Settings['visibleTabs'];
  expandedKeys: ReadonlySet<string>;
  onToggleExpand: (key: string) => void;
  now: number;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: TabWithId) => void;
  getMoveTargets?: (tab: TabWithId) => MoveTarget[];
  onMove?: (tab: TabWithId, target: MoveTarget) => void;
  onCloseWindow?: (win: chrome.windows.Window, sectionEl: HTMLElement | null) => void;
  onReadLater?: (tab: TabWithId) => void;
  onSaveWindow?: (win: chrome.windows.Window) => void;
  onSplit?: (tab: TabWithId) => void;
  onHoverDup?: (tabId: number | null) => void;
}

// 窗口区块（设计稿 win-block）：区块头 + 列表；当前窗口强调描边
export default function WindowSection(props: WindowSectionProps) {
  const {
    window: win,
    windowNumber,
    tabs,
    isCurrent,
    draggable,
    dedupePreview,
    previewByTabId,
    visibleLimit,
    expandedKeys,
    onToggleExpand,
  } = props;
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);

  // favicon 叠层：去重后最多 4 个（设计稿 fav-stack）
  const stackKeys = new Set<string>();
  const stack: TabWithId[] = [];
  for (const tab of tabs) {
    const key = hostnameOf(tab.url);
    if (stackKeys.has(key)) continue;
    stackKeys.add(key);
    stack.push(tab);
    if (stack.length >= 4) break;
  }
  const pinnedCount = tabs.filter((x) => x.pinned).length;

  const shownTabs = dedupePreview ? tabs.filter((x) => previewByTabId.has(x.id)) : tabs;
  const foldKey = `w${win.id}`;
  const fold = dedupePreview
    ? { shown: shownTabs, hiddenCount: 0, expanded: false }
    : // 重复组成员豁免折叠，否则徽标与同组高亮会被藏进折叠区（spec 2026-08-17-dup-fold-exemption）
      foldTabs(tabs, visibleLimit, expandedKeys.has(foldKey), (tab) =>
        props.dupCountByTabId.has(tab.id),
      );

  return (
    <section
      className={`win-block${isCurrent ? ' is-current' : ''}`}
      data-window-id={win.id}
      ref={sectionRef}
    >
      <div className="win-head">
        <span className="win-title">
          {t('window.label', { n: windowNumber })}
          {isCurrent && <span className="cur-chip">{t('window.current')}</span>}
        </span>
        <span className="fav-stack">
          {stack.map((tab) => (
            <Favicon key={tab.id} url={tab.url} favIconUrl={tab.favIconUrl} />
          ))}
        </span>
        <span className="win-meta num">
          {t('window.tabCount', { n: tabs.length })}
          {pinnedCount > 0 && ` · ${t('window.pinnedCount', { n: pinnedCount })}`}
        </span>
        <span className="win-acts">
          {props.onSaveWindow && (
            <button
              className="ghost-btn"
              title={t('window.save')}
              onClick={() => props.onSaveWindow?.(win)}
            >
              <Icon name="save" size={13} />
              {t('window.save')}
            </button>
          )}
          {props.onCloseWindow && (
            <button
              className="ghost-btn danger"
              title={t('window.close')}
              onClick={() => props.onCloseWindow?.(win, sectionRef.current)}
            >
              <Icon name="close" size={13} />
              {t('window.close')}
            </button>
          )}
        </span>
      </div>
      <SortableContext items={fold.shown.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <ul className="tab-list">
          {fold.shown.map((tab) => (
            <TabRow
              key={tab.id}
              tab={tab}
              dupCount={props.dupCountByTabId.get(tab.id)}
              dupPreview={previewByTabId.get(tab.id)}
              draggable={draggable}
              now={props.now}
              registerRow={props.registerRow}
              onClose={props.onCloseTab}
              getMoveTargets={props.getMoveTargets}
              onMove={props.onMove}
              onReadLater={props.onReadLater}
              onSplit={props.onSplit}
              onHoverDup={props.onHoverDup}
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
