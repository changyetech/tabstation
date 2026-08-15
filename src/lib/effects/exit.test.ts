import { describe, expect, it } from 'vitest';
import { animateElementOut, undoAnimateElementOut } from './exit';

describe('undoAnimateElementOut', () => {
  it('摘掉 .closing：退场失败回滚后元素恢复可见/可点', () => {
    const el = document.createElement('div');
    animateElementOut(el);
    expect(el.classList.contains('closing')).toBe(true);

    undoAnimateElementOut(el);
    expect(el.classList.contains('closing')).toBe(false);
  });
});
