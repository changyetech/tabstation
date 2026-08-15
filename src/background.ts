import { MANAGER_PATH } from './lib/manager-url';
import { findManagerTab } from './lib/singleton';

// background 唯一职责：图标点击/快捷键 → 管理页单例（spec §4.2）
// service worker 随时休眠，不持有状态——每次都从 storage 读设置
export async function openManager(): Promise<void> {
  const url = chrome.runtime.getURL(MANAGER_PATH);
  const [{ settings }, current, tabs] = await Promise.all([
    chrome.storage.local.get('settings') as Promise<{
      settings?: { managerPageScope?: 'global' | 'per-window' };
    }>,
    chrome.windows.getLastFocused(),
    chrome.tabs.query({}),
  ]);
  const scope = settings?.managerPageScope ?? 'global';
  // 无聚焦窗口时（current.id 缺失或为 WINDOW_ID_NONE）统一按「无当前窗口」处理
  const currentWindowId =
    current.id === undefined || current.id === chrome.windows.WINDOW_ID_NONE
      ? chrome.windows.WINDOW_ID_NONE
      : current.id;
  const existing = findManagerTab(tabs, url, scope, currentWindowId);
  if (existing) {
    await chrome.windows.update(existing.windowId, { focused: true });
    if (existing.id !== undefined) await chrome.tabs.update(existing.id, { active: true });
  } else {
    await chrome.tabs.create(
      currentWindowId === chrome.windows.WINDOW_ID_NONE
        ? { url }
        : { url, windowId: currentWindowId },
    );
  }
}

chrome.action.onClicked.addListener(() => void openManager());
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-manager') void openManager();
});
