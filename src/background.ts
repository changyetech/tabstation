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

// openManager 内部有 windows.update/tabs.update/tabs.create 等写操作，
// 快照与写入之间用户可能已手动关闭目标 tab/窗口，导致 reject；
// service worker 里的未捕获 rejection 没有页面可见、用户不会去看 console，
// 吞掉即可——点击图标无反应本身就是最坏情况的全部代价，不吞会更糟（无诊断且报错刷屏）
export async function safeOpenManager(): Promise<void> {
  try {
    await openManager();
  } catch {
    // 见上方注释：吞掉即可，避免变成 SW 里无人看见的静默失败
  }
}

chrome.action.onClicked.addListener(() => void safeOpenManager());
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-manager') void safeOpenManager();
});
