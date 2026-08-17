import type { TabWithId } from '../lib/dedupe';
import { useT } from '../i18n';
import { groupByDomain } from '../lib/grouping';
import { foldTabs } from '../lib/fold';
import type { Settings } from '../lib/storage';
import { Icon, letterBadgeHue } from './icons';
import type { MoveTarget } from './MoveMenu';
import Favicon from './Favicon';
import TabRow from './TabRow';

export interface DomainActionHandlers {
  onDomainReadLater: (tabs: TabWithId[]) => void;
  onDomainSplit: (tabs: TabWithId[]) => void;
  onDomainCloseAll: (tabs: TabWithId[]) => void;
}

export interface DomainGroupListProps extends DomainActionHandlers {
  tabs: TabWithId[];
  now: number;
  dupCountByTabId: Map<number, number>;
  previewByTabId: Map<number, 'keep' | 'close'>;
  dedupePreview: boolean;
  visibleLimit: Settings['visibleTabs'];
  expandedKeys: ReadonlySet<string>;
  onToggleExpand: (key: string) => void;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: TabWithId) => void;
  getMoveTargets?: (tab: TabWithId) => MoveTarget[];
  onMove?: (tab: TabWithId, target: MoveTarget) => void;
  onReadLater?: (tab: TabWithId) => void;
  onSplit?: (tab: TabWithId) => void;
  onHoverDup?: (tabId: number | null) => void;
}

// 域名行批量操作组（spec §5.1）：稍后阅读 / 拆窗 / 关闭，悬停浮现
function DomainActs({
  tabs,
  onDomainReadLater,
  onDomainSplit,
  onDomainCloseAll,
}: { tabs: TabWithId[] } & DomainActionHandlers) {
  const t = useT();
  return (
    <span className="dom-acts">
      <button
        className="icon-btn"
        title={t('dom.readLater')}
        onClick={() => onDomainReadLater(tabs)}
      >
        <Icon name="bookAdd" size={13} />
      </button>
      <button className="icon-btn" title={t('dom.split')} onClick={() => onDomainSplit(tabs)}>
        <Icon name="winNew" size={13} />
      </button>
      <button
        className="icon-btn danger"
        title={t('dom.closeAll')}
        onClick={() => onDomainCloseAll(tabs)}
      >
        <Icon name="close" size={13} />
      </button>
    </span>
  );
}

// 域名视图（spec §5.1，仅全部模式）：按 hostname 聚合、tab 数降序、两行式标签行、只读不可拖
export default function DomainGroupList(props: DomainGroupListProps) {
  const { tabs, dedupePreview, previewByTabId, visibleLimit, expandedKeys, onToggleExpand } = props;
  const t = useT();
  const label = (key: string) =>
    key === '#chrome'
      ? 'chrome'
      : key === '#file'
        ? t('domain.localFiles')
        : key === '#other'
          ? t('domain.other')
          : key;

  // 去重预览：只保留重复组成员，空组隐藏（spec §5.4）
  const groups = groupByDomain(tabs)
    .map((g) => ({
      ...g,
      tabs: dedupePreview ? g.tabs.filter((x) => previewByTabId.has(x.id)) : g.tabs,
    }))
    .filter((g) => g.tabs.length > 0);

  const rows = (groupTabs: TabWithId[]) =>
    groupTabs.map((tab) => (
      <TabRow
        key={tab.id}
        tab={tab}
        now={props.now}
        dupCount={props.dupCountByTabId.get(tab.id)}
        dupPreview={previewByTabId.get(tab.id)}
        draggable={false}
        subUrl
        noFav
        registerRow={props.registerRow}
        onClose={props.onCloseTab}
        getMoveTargets={props.getMoveTargets}
        onMove={props.onMove}
        onReadLater={props.onReadLater}
        onSplit={props.onSplit}
        onHoverDup={props.onHoverDup}
      />
    ));

  const headFavicon = (groupTabs: TabWithId[], key: string) => {
    // 组内任一有声明图标的 tab 代表整组（spec §5.1）
    const rep = groupTabs.find((x) => x.favIconUrl) ?? groupTabs[0];
    return (
      <Favicon
        url={rep?.url}
        favIconUrl={rep?.favIconUrl}
        host={key.startsWith('#') ? key.slice(1) : key}
      />
    );
  };

  // 每域名一个区块，大屏双列瀑布 + 折叠
  return (
    <div className="dom-flow">
      {groups.map((g) => {
        const foldKey = `d${g.key}`;
        const fold = dedupePreview
          ? { shown: g.tabs, hiddenCount: 0, expanded: false }
          : // 重复组成员豁免折叠（spec 2026-08-17-dup-fold-exemption）
            foldTabs(g.tabs, visibleLimit, expandedKeys.has(foldKey), (tab) =>
              props.dupCountByTabId.has(tab.id),
            );
        const host = g.key.startsWith('#') ? g.key.slice(1) : g.key;
        return (
          <section className="win-block" key={g.key}>
            <div
              className="dom-strip"
              style={{ background: `oklch(45% 0.11 ${letterBadgeHue(host)})` }}
            />
            <div className="win-head">
              <span className="win-title">
                {headFavicon(g.tabs, g.key)}
                {label(g.key)}
              </span>
              <span className="win-meta num">{t('window.tabCount', { n: g.tabs.length })}</span>
              <DomainActs
                tabs={g.tabs}
                onDomainReadLater={props.onDomainReadLater}
                onDomainSplit={props.onDomainSplit}
                onDomainCloseAll={props.onDomainCloseAll}
              />
            </div>
            <ul className="tab-list">
              {rows(fold.shown)}
              {fold.hiddenCount > 0 && (
                <li className="more-row">
                  <button className="more-btn num" onClick={() => onToggleExpand(foldKey)}>
                    {fold.expanded ? t('more.collapse') : t('more.expand', { n: fold.hiddenCount })}
                  </button>
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
