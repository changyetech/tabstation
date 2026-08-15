import { useEffect, useState } from 'react';

// 运行时数据不落盘：Chrome 是唯一数据源（spec §6）。
// 事件触发全量重查——tab 数量级下 query 成本可忽略，增量 diff 只增复杂度。
export function useTabs(): {
  tabs: chrome.tabs.Tab[];
  windows: chrome.windows.Window[];
  currentWindowId: number | undefined;
} {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);
  const [currentWindowId, setCurrentWindowId] = useState<number>();

  useEffect(() => {
    let alive = true;
    let seq = 0;
    const refresh = async () => {
      const my = ++seq;
      const [allTabs, allWindows, current] = await Promise.all([
        chrome.tabs.query({}),
        chrome.windows.getAll(),
        chrome.windows.getCurrent(),
      ]);
      // 仅最后一次发起的刷新可以落地：事件密集时多个 refresh 并发，
      // 先发起的可能后 resolve，用过期快照覆盖新结果
      if (!alive || my !== seq) return;
      // windows.getAll() 默认只返回 normal/popup 窗口，tabs.query({}) 不做 windowType 过滤，
      // 口径不一致会让 app/devtools 等窗口里的 tab 出现在 tabs 里却没有对应窗口——
      // 这类 tab 在窗口模式下不渲染，却仍会被去重统计/关闭。这里按已知窗口过滤，保持两者一致
      const knownWindowIds = new Set(allWindows.map((w) => w.id));
      setTabs(allTabs.filter((tab) => knownWindowIds.has(tab.windowId)));
      setWindows(allWindows);
      setCurrentWindowId(current.id);
    };
    void refresh();

    const events = [
      chrome.tabs.onCreated,
      chrome.tabs.onRemoved,
      chrome.tabs.onUpdated,
      chrome.tabs.onMoved,
      chrome.tabs.onActivated,
      chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.windows.onCreated,
      chrome.windows.onRemoved,
      chrome.windows.onFocusChanged,
    ];
    const handler = () => void refresh();
    events.forEach((e) => e.addListener(handler));
    return () => {
      alive = false;
      events.forEach((e) => e.removeListener(handler));
    };
  }, []);

  return { tabs, windows, currentWindowId };
}
