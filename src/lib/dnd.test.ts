import { describe, expect, it } from 'vitest';
import { dragEndToMove } from './dnd';

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
