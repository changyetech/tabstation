import { useEffect, useState } from 'react';

// 运行时数据不落盘：Chrome 是唯一数据源（spec §6）。
// 事件触发全量重查——tab 数量级下 query 成本可忽略，增量 diff 只增复杂度。
//
// 但事件本身很密：单个页面加载就会连发多条 onUpdated（status / title / favIconUrl），
// N 个 tab 同时加载时每秒可达数十次「3 次 chrome API + 全树重渲染」。
// 故做合流：首个事件立即重查（保持响应即时），其后冷却窗口内的事件合并为一次尾随重查。
const COALESCE_MS = 60;

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

    // 冷却窗口内的事件合并：cooldown 有值 = 处于窗口内，只记一个待办标记，
    // 窗口结束时若有待办再补一次（保证最后一个事件的结果一定落地）
    let cooldown: number | undefined;
    let queued = false;
    const schedule = () => {
      if (cooldown !== undefined) {
        queued = true;
        return;
      }
      void refresh();
      cooldown = window.setTimeout(() => {
        cooldown = undefined;
        if (queued) {
          queued = false;
          schedule();
        }
      }, COALESCE_MS);
    };

    const events = [
      chrome.tabs.onCreated,
      chrome.tabs.onRemoved,
      chrome.tabs.onUpdated,
      chrome.tabs.onMoved,
      chrome.tabs.onActivated,
      chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      // 预渲染换页会替换 tabId：不重查则列表里的 id 变陈旧，点击激活/关闭都会打空
      chrome.tabs.onReplaced,
      chrome.windows.onCreated,
      chrome.windows.onRemoved,
      chrome.windows.onFocusChanged,
    ];
    events.forEach((e) => e.addListener(schedule));
    return () => {
      alive = false;
      window.clearTimeout(cooldown);
      events.forEach((e) => e.removeListener(schedule));
    };
  }, []);

  return { tabs, windows, currentWindowId };
}
