import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../../test/chrome-mock';

vi.mock('./sound', () => ({ playCloseSound: vi.fn() }));
vi.mock('./confetti', () => ({ shootConfetti: vi.fn() }));

import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';
import { closeTabsWithEffect } from './batch';

function entry(tabId: number) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return { tabId, el };
}

describe('closeTabsWithEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('空列表：无任何副作用', async () => {
    await closeTabsWithEffect([]);
    expect(playCloseSound).not.toHaveBeenCalled();
  });

  it('批量：音效只播一次，粒子按 40ms 错开，动画后统一 remove', async () => {
    const { chromeMock } = getChromeMock();
    const entries = [entry(1), entry(2), entry(3)];
    const done = closeTabsWithEffect(entries);

    expect(playCloseSound).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(0);
    expect(shootConfetti).toHaveBeenCalledTimes(1); // 第 0 行立即
    vi.advanceTimersByTime(40);
    expect(shootConfetti).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(40);
    expect(shootConfetti).toHaveBeenCalledTimes(3);

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300); // 最后一行的退场动画
    await done;
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('el 为 null 的行不出粒子但 tab 照常关闭', async () => {
    const { chromeMock } = getChromeMock();
    const done = closeTabsWithEffect([{ tabId: 7, el: null }]);
    vi.advanceTimersByTime(300);
    await done;
    expect(shootConfetti).not.toHaveBeenCalled();
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([7]);
  });
});
