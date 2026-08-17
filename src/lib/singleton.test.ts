import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { findManagerTab } from './singleton';
import { MANAGER_PATH, NEWTAB_PATH } from './urls';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('findManagerTab', () => {
  const managerInWin1 = makeTab({ id: 10, url: MANAGER, windowId: 1 });
  const managerInWin2 = makeTab({ id: 20, url: MANAGER, windowId: 2 });
  const normal = makeTab({ id: 30, url: 'https://a.com/', windowId: 1 });

  it('global：任意窗口有管理页即返回；优先当前窗口的', () => {
    expect(findManagerTab([normal, managerInWin2], MANAGER, 'global', 1)?.id).toBe(20);
    expect(findManagerTab([managerInWin1, managerInWin2], MANAGER, 'global', 2)?.id).toBe(20);
  });

  it('global：无管理页返回 undefined', () => {
    expect(findManagerTab([normal], MANAGER, 'global', 1)).toBeUndefined();
  });

  it('per-window：只找当前窗口', () => {
    expect(findManagerTab([managerInWin2], MANAGER, 'per-window', 1)).toBeUndefined();
    expect(findManagerTab([managerInWin2], MANAGER, 'per-window', 2)?.id).toBe(20);
  });

  it('新标签页不得被当成管理页（单例护栏）', () => {
    const BASE = 'chrome-extension://test-id/';
    const managerUrl = BASE + MANAGER_PATH;
    const newTab = makeTab({ id: 5, url: BASE + NEWTAB_PATH });
    expect(findManagerTab([newTab], managerUrl, 'global', 1)).toBeUndefined();
  });
});
