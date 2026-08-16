import type { Settings } from './storage';

export interface FoldResult<T> {
  shown: T[];
  /** 折叠中的行数；0 = 无需 more 行 */
  hiddenCount: number;
  /** 是否处于展开态（决定 more 行文案「收起」/「展开」） */
  expanded: boolean;
}

// 展示条数折叠（spec §5.2）：超出 limit 截断；expanded 时全量但保留「收起」入口
export function foldTabs<T>(
  tabs: T[],
  limit: Settings['visibleTabs'],
  expanded: boolean,
): FoldResult<T> {
  if (limit === 'all' || tabs.length <= limit) {
    return { shown: tabs, hiddenCount: 0, expanded: false };
  }
  return {
    shown: expanded ? tabs : tabs.slice(0, limit),
    hiddenCount: tabs.length - limit,
    expanded,
  };
}
