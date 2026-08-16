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

// 会话卡片拖拽落点 → moveSessionTab 参数（spec 2026-08-16-session-card-dnd §3.2）
// 无落点或原位返回 null（不写 storage）
export interface SessionDragData {
  sessionId: string;
  index: number;
}

export function sessionDragEndToMove(
  active: SessionDragData,
  over: SessionDragData | null,
): { fromSessionId: string; fromIndex: number; toSessionId: string; toIndex: number } | null {
  if (!over) return null;
  if (over.sessionId === active.sessionId && over.index === active.index) return null;
  return {
    fromSessionId: active.sessionId,
    fromIndex: active.index,
    toSessionId: over.sessionId,
    toIndex: over.index,
  };
}
