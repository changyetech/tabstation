// 拖拽落点 → chrome.tabs.move 参数（spec §5.2）
// 注：普通 tab 移到 pinned 区前方时 Chrome 会自动钳制 index，无需额外处理
export interface DragTabData {
  tabId: number;
  windowId: number;
  index: number;
}

export function dragEndToMove(
  active: DragTabData,
  over: DragTabData | null,
): { tabId: number; windowId: number; index: number } | null {
  if (!over || over.tabId === active.tabId) return null;
  return { tabId: active.tabId, windowId: over.windowId, index: over.index };
}
