// 管理页单例查找（spec §4.2）：
// global 全浏览器找（优先当前窗口，减少不必要的跨窗口跳转）；per-window 仅当前窗口
export function findManagerTab(
  tabs: chrome.tabs.Tab[],
  managerUrl: string,
  scope: 'global' | 'per-window',
  currentWindowId: number,
): chrome.tabs.Tab | undefined {
  const managers = tabs.filter((t) => t.url?.startsWith(managerUrl));
  const inCurrent = managers.find((t) => t.windowId === currentWindowId);
  if (scope === 'per-window') return inCurrent;
  return inCurrent ?? managers[0];
}
