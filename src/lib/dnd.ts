import { pointerWithin, rectIntersection, type CollisionDetection } from '@dnd-kit/core';

// 碰撞检测（spec 2026-08-16-session-card-dnd §3.4）：指针命中行 → 精确落点；
// 未命中退回矩形相交（卡内空隙仍有落点）；两者皆无 → over 为 null，
// 卡外/空白处松手 = 取消不移动，保留误拖的撤退路径（不能用 closestCenter，它永远有 over）
export const cardDropCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : rectIntersection(args);
};

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

// 跨卡落点行判定（spec 2026-08-16-session-card-dnd §3.4）：
// 仅跨容器悬停时显示插入指示线；同容器已有 dnd-kit 让位动画，避免双重反馈
export function isCrossCardOver(
  isOver: boolean,
  activeContainer: string | number | undefined,
  rowContainer: string | number,
): boolean {
  return isOver && activeContainer !== undefined && activeContainer !== rowContainer;
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
