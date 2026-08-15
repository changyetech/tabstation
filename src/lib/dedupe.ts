import { normalizeUrl } from './url';

// chrome 类型里 tab.id 是可选的；本模块只处理有 id 的 tab，
// 用类型收窄代替非空断言，消费方拿到的 id 一定是 number
export type TabWithId = chrome.tabs.Tab & { id: number };

export function hasId(tab: chrome.tabs.Tab): tab is TabWithId {
  return tab.id !== undefined;
}

export interface DuplicateGroup {
  url: string; // 归一化后的 URL
  tabs: TabWithId[];
}

// 重复组：归一化 URL 相同且 ≥2、并非全部 pinned；管理页不计入。范围 = 传入的全部 tab（全浏览器）
export function findDuplicateGroups(tabs: chrome.tabs.Tab[], managerUrl: string): DuplicateGroup[] {
  const byUrl = new Map<string, TabWithId[]>();
  for (const tab of tabs) {
    if (!hasId(tab) || !tab.url || tab.url.startsWith(managerUrl)) continue;
    const key = normalizeUrl(tab.url);
    byUrl.set(key, [...(byUrl.get(key) ?? []), tab]);
  }
  const groups: DuplicateGroup[] = [];
  for (const [url, group] of byUrl) {
    if (group.length < 2) continue;
    if (group.every((t) => t.pinned)) continue; // 全 pinned 组不算重复
    groups.push({ url, tabs: group });
  }
  return groups;
}

export interface DedupePlan {
  keepIds: number[];
  closeIds: number[];
}

// 去重计划：混合组保留所有 pinned；纯普通组保留 lastAccessed 最新（undefined 视为最旧）
export function planDedupe(groups: DuplicateGroup[]): DedupePlan {
  const keepIds: number[] = [];
  const closeIds: number[] = [];
  for (const group of groups) {
    const pinned = group.tabs.filter((t) => t.pinned);
    if (pinned.length > 0) {
      keepIds.push(...pinned.map((t) => t.id));
      closeIds.push(...group.tabs.filter((t) => !t.pinned).map((t) => t.id));
    } else {
      const newest = group.tabs.reduce((a, b) =>
        (b.lastAccessed ?? -1) > (a.lastAccessed ?? -1) ? b : a,
      );
      keepIds.push(newest.id);
      closeIds.push(...group.tabs.filter((t) => t !== newest).map((t) => t.id));
    }
  }
  return { keepIds, closeIds };
}
