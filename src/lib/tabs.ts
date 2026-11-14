import { hasId, type TabWithId } from './dedupe';

// 自有页面在一切列表与计数中隐身；同时收窄无 id 的 tab。
// 与注册域排序分离，避免后台为轻量过滤加载整份域名后缀库。
export function visibleTabs(tabs: chrome.tabs.Tab[], managerUrl: string): TabWithId[] {
  return tabs.filter((tab): tab is TabWithId => hasId(tab) && !tab.url?.startsWith(managerUrl));
}
