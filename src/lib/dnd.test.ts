import { describe, expect, it } from 'vitest';
import { dragEndToMove, sessionDragEndToMove } from './dnd';

describe('dragEndToMove', () => {
  it('同窗口拖动 → 目标行的真实 index', () => {
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 2, windowId: 10, index: 3 }),
    ).toEqual({ tabId: 1, windowId: 10, index: 3 });
  });
  it('跨窗口拖动 → 目标窗口 + 目标行 index', () => {
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 5, windowId: 20, index: 1 }),
    ).toEqual({ tabId: 1, windowId: 20, index: 1 });
  });
  it('落点为空或落回自身 → null（不移动）', () => {
    expect(dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, null)).toBeNull();
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 1, windowId: 10, index: 0 }),
    ).toBeNull();
  });
});

describe('sessionDragEndToMove', () => {
  it('跨会话落点 → 四参映射', () => {
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 2 }, { sessionId: 's2', index: 0 }),
    ).toEqual({ fromSessionId: 's1', fromIndex: 2, toSessionId: 's2', toIndex: 0 });
  });
  it('同会话不同下标 → 四参映射', () => {
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 0 }, { sessionId: 's1', index: 3 }),
    ).toEqual({ fromSessionId: 's1', fromIndex: 0, toSessionId: 's1', toIndex: 3 });
  });
  it('无落点或原位 → null', () => {
    expect(sessionDragEndToMove({ sessionId: 's1', index: 0 }, null)).toBeNull();
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 1 }, { sessionId: 's1', index: 1 }),
    ).toBeNull();
  });
});
