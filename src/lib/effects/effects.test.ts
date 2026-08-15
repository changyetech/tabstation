import { describe, expect, it, vi } from 'vitest';
import { animateElementOut } from './exit';
import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';

describe('effects 冒烟', () => {
  it('playCloseSound：AudioContext 不可用时静默不抛', () => {
    // jsdom 无 AudioContext——恰好就是"不可用"场景
    expect(() => playCloseSound()).not.toThrow();
  });

  it('shootConfetti：向 body 添加 17 个粒子元素', () => {
    shootConfetti(100, 100);
    expect(document.body.querySelectorAll('[data-confetti]')).toHaveLength(17);
  });

  it('animateElementOut：加 .closing，300ms 后回调', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const done = vi.fn();
    animateElementOut(el, done);
    expect(el.classList.contains('closing')).toBe(true);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
