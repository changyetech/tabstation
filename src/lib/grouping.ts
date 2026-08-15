// 管理页在一切列表与计数中隐身（spec §4.3）
export function visibleTabs(tabs: chrome.tabs.Tab[], managerUrl: string): chrome.tabs.Tab[] {
  return tabs.filter((t) => !t.url?.startsWith(managerUrl));
}

// 从 URL 取 hostname；无 URL 或非法 URL 返回空串。全项目唯一实现——TabRow 与 domainGroupKey 共用
export function hostnameOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// 域名分组 key：http/https 用 hostname；chrome://、file:// 与其余协议进特殊兜底组（spec §5.7）
// '#' 不会出现在合法 hostname 中，用作特殊组前缀无碰撞
export function domainGroupKey(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return hostnameOf(url);
    if (u.protocol === 'chrome:') return '#chrome';
    if (u.protocol === 'file:') return '#file';
    return '#other';
  } catch {
    return '#other';
  }
}

export interface DomainGroup {
  key: string;
  tabs: chrome.tabs.Tab[];
}

export function groupByDomain(tabs: chrome.tabs.Tab[]): DomainGroup[] {
  const map = new Map<string, chrome.tabs.Tab[]>();
  for (const tab of tabs) {
    const key = domainGroupKey(tab.url ?? '');
    map.set(key, [...(map.get(key) ?? []), tab]);
  }
  return [...map.entries()]
    .map(([key, groupTabs]) => ({ key, tabs: groupTabs }))
    .sort((a, b) => b.tabs.length - a.tabs.length);
}

// 当前窗口置顶，其余保持原顺序（Array.sort 是稳定排序）
export function sortWindowsCurrentFirst<T extends { id?: number }>(
  windows: T[],
  currentWindowId: number | undefined,
): T[] {
  if (currentWindowId === undefined) return [...windows];
  return [...windows].sort(
    (a, b) => Number(b.id === currentWindowId) - Number(a.id === currentWindowId),
  );
}
