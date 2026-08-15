import { beforeEach, describe, expect, it } from 'vitest';
import { getChromeMock } from './test/chrome-mock';
import { makeTab, makeWindow } from './test/factories';
import { openManager } from './background';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('openManager', () => {
  beforeEach(() => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getLastFocused.mockResolvedValue(makeWindow({ id: 1 }));
  });

  it('无既有管理页 → 在当前窗口新建', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, url: 'https://a.com/' })]);
    await openManager();
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: MANAGER, windowId: 1 });
  });

  it('global（默认）：他窗口已有管理页 → 聚焦其窗口并激活该 tab，不新建', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 7, url: MANAGER, windowId: 2 })]);
    await openManager();
    expect(chromeMock.windows.update).toHaveBeenCalledWith(2, { focused: true });
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(7, { active: true });
    expect(chromeMock.tabs.create).not.toHaveBeenCalled();
  });

  it('per-window：他窗口的管理页不算数 → 当前窗口新建', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.settings = {
      managerPageScope: 'per-window',
      closeWindowAfterSave: false,
      language: 'auto',
    };
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 7, url: MANAGER, windowId: 2 })]);
    await openManager();
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: MANAGER, windowId: 1 });
  });

  it('无聚焦窗口（id 缺失）→ 不带 windowId 新建', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getLastFocused.mockResolvedValue({ ...makeWindow({}), id: undefined });
    chromeMock.tabs.query.mockResolvedValue([]);
    await openManager();
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: MANAGER });
  });
});
