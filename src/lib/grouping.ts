import { getDomain } from 'tldts';
export { hostnameOf } from './url';
export { visibleTabs } from './tabs';

// 域名分组 key：http/https 用 hostname；chrome://、file:// 与其余协议进特殊兜底组（spec §5.7）
// '#' 不会出现在合法 hostname 中，用作特殊组前缀无碰撞
export function domainGroupKey(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.hostname;
    if (u.protocol === 'chrome:') return '#chrome';
    if (u.protocol === 'file:') return '#file';
    return '#other';
  } catch {
    return '#other';
  }
}

export interface DomainGroup<T extends chrome.tabs.Tab = chrome.tabs.Tab> {
  key: string;
  tabs: T[];
}

const hostnameCollator = new Intl.Collator('en', { numeric: true });
const specialGroupOrder = new Map([
  ['#chrome', 1],
  ['#file', 2],
  ['#other', 3],
]);

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, '');
}

function subdomainLabels(hostname: string, registeredDomain: string): string[] {
  if (hostname === registeredDomain) return [];
  // hostname 从右向左逐级收紧；反转后先比较更接近注册域的层级。
  return hostname
    .slice(0, -registeredDomain.length - 1)
    .split('.')
    .reverse();
}

function domainSortKey(key: string) {
  const hostname = normalizeHostname(key);
  const domain = getDomain(hostname, { allowPrivateDomains: true }) ?? hostname;
  return {
    order: specialGroupOrder.get(key) ?? 0,
    domain,
    subdomains: subdomainLabels(hostname, domain),
  };
}

function compareDomainKeys(
  left: ReturnType<typeof domainSortKey>,
  right: ReturnType<typeof domainSortKey>,
): number {
  const byOrder = left.order - right.order;
  if (byOrder !== 0) return byOrder;
  const byRegisteredDomain = hostnameCollator.compare(left.domain, right.domain);
  if (byRegisteredDomain !== 0) return byRegisteredDomain;

  const leftSubdomains = left.subdomains;
  const rightSubdomains = right.subdomains;
  const depth = Math.min(leftSubdomains.length, rightSubdomains.length);
  for (let i = 0; i < depth; i += 1) {
    const byLabel = hostnameCollator.compare(leftSubdomains[i], rightSubdomains[i]);
    if (byLabel !== 0) return byLabel;
  }
  return leftSubdomains.length - rightSubdomains.length;
}

export function groupByDomain<T extends chrome.tabs.Tab>(tabs: T[]): DomainGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const tab of tabs) {
    const key = domainGroupKey(tab.url ?? '');
    const bucket = map.get(key);
    if (bucket) bucket.push(tab);
    else map.set(key, [tab]);
  }
  return (
    [...map.entries()]
      // 注册域解析只做每组一次，而不是每次排序比较时重复执行。
      .map(([key, groupTabs]) => ({ key, tabs: groupTabs, sortKey: domainSortKey(key) }))
      .sort((a, b) => compareDomainKeys(a.sortKey, b.sortKey))
      .map(({ key, tabs }) => ({ key, tabs }))
  );
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
