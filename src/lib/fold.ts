import type { Settings } from './storage';

export interface FoldResult<T> {
  shown: T[];
  /** 折叠中的行数；0 = 无需 more 行 */
  hiddenCount: number;
  /** 是否处于展开态（决定 more 行文案「收起」/「展开」） */
  expanded: boolean;
}

// 展示条数折叠（spec §5.2）：超出 limit 截断；expanded 时全量但保留「收起」入口。
// isExempt 命中的行豁免折叠（重复组成员，spec 2026-08-17-dup-fold-exemption）——
// 折叠态展示 = 前 limit 条 ∪ 全部豁免行，保持原顺序
export function foldTabs<T>(
  tabs: T[],
  limit: Settings['visibleTabs'],
  expanded: boolean,
  isExempt?: (item: T) => boolean,
): FoldResult<T> {
  if (limit === 'all' || tabs.length <= limit) {
    return { shown: tabs, hiddenCount: 0, expanded: false };
  }
  const collapsed = tabs.filter((item, i) => i < limit || isExempt?.(item) === true);
  const hiddenCount = tabs.length - collapsed.length;
  if (hiddenCount === 0) {
    return { shown: tabs, hiddenCount: 0, expanded: false };
  }
  return { shown: expanded ? tabs : collapsed, hiddenCount, expanded };
}
