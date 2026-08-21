import { getDomain } from 'tldts';
import { hasId, type TabWithId } from './dedupe';

// 管理页在一切列表与计数中隐身（spec §4.3）；同时收窄掉无 id 的 tab，
// 使 UI 层拿到的一律是 TabWithId，无需再做非空断言
export function visibleTabs(tabs: chrome.tabs.Tab[], managerUrl: string): TabWithId[] {
  return tabs.filter((t) => !t.url?.startsWith(managerUrl)).filter(hasId);
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

function compareHostnames(left: string, right: string): number {
  const leftHostname = normalizeHostname(left);
  const rightHostname = normalizeHostname(right);
  const leftDomain = getDomain(leftHostname, { allowPrivateDomains: true }) ?? leftHostname;
  const rightDomain = getDomain(rightHostname, { allowPrivateDomains: true }) ?? rightHostname;
  const byRegisteredDomain = hostnameCollator.compare(leftDomain, rightDomain);
  if (byRegisteredDomain !== 0) return byRegisteredDomain;

  const leftSubdomains = subdomainLabels(leftHostname, leftDomain);
  const rightSubdomains = subdomainLabels(rightHostname, rightDomain);
  const depth = Math.min(leftSubdomains.length, rightSubdomains.length);
  for (let i = 0; i < depth; i += 1) {
    const byLabel = hostnameCollator.compare(leftSubdomains[i], rightSubdomains[i]);
    if (byLabel !== 0) return byLabel;
  }
  return leftSubdomains.length - rightSubdomains.length;
}

function compareDomainGroupKeys(left: string, right: string): number {
  const leftOrder = specialGroupOrder.get(left) ?? 0;
  const rightOrder = specialGroupOrder.get(right) ?? 0;
  return leftOrder - rightOrder || compareHostnames(left, right);
}

export function groupByDomain<T extends chrome.tabs.Tab>(tabs: T[]): DomainGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const tab of tabs) {
    const key = domainGroupKey(tab.url ?? '');
    const bucket = map.get(key);
    if (bucket) bucket.push(tab);
    else map.set(key, [tab]);
  }
  return [...map.entries()]
    .map(([key, groupTabs]) => ({ key, tabs: groupTabs }))
    .sort((a, b) => compareDomainGroupKeys(a.key, b.key));
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
