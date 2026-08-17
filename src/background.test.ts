import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from './test/chrome-mock';
import { makeTab, makeWindow } from './test/factories';
import { openManager, safeOpenManager } from './background';

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

describe('safeOpenManager', () => {
  beforeEach(() => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getLastFocused.mockResolvedValue(makeWindow({ id: 1 }));
  });

  it('openManager 内部写操作（windows.update）reject：不向外抛出', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 7, url: MANAGER, windowId: 2 })]);
    chromeMock.windows.update.mockRejectedValueOnce(new Error('No window with id: 2'));
    await expect(safeOpenManager()).resolves.toBeUndefined();
  });

  it('openManager 内部写操作（tabs.create）reject：不向外抛出', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.tabs.create.mockRejectedValueOnce(new Error('No window with id: 1'));
    await expect(safeOpenManager()).resolves.toBeUndefined();
  });
});

describe('omnibox', () => {
  it('建议中排除自有页面（管理页与新标签页）', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, title: 'x 普通页' }),
      makeTab({
        id: 2,
        url: 'chrome-extension://test-id/src/manager/index.html',
        title: 'x 管理页',
      }),
      makeTab({
        id: 3,
        url: 'chrome-extension://test-id/src/newtab/index.html',
        title: 'x 新标签页',
      }),
    ]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0]).toHaveLength(1);
  });

  it('建议条数受总数上限约束（matchOmnibox 内已限额，此处只验证透传）', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeTab({ id: i + 1, title: `x 标签 ${i}` })),
    );
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0].length).toBeLessThanOrEqual(6);
  });

  it('默认建议兜底：始终调用 setDefaultSuggestion', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.omnibox.onInputChanged.emit('无匹配乱码', vi.fn());
    await vi.waitFor(() => expect(chromeMock.omnibox.setDefaultSuggestion).toHaveBeenCalled());
    expect(chromeMock.omnibox.setDefaultSuggestion).toHaveBeenCalledWith({
      description: '没有匹配项 · 回车打开 Tab Station',
    });
  });

  it('settings.language 为 en 时，建议类型标签与默认建议文案都译为英文', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.settings = { language: 'en' };
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, title: 'x English Tab' })]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    const [suggestion] = suggest.mock.calls[0][0];
    expect(suggestion.description).toContain('<dim>Tab</dim>');
    expect(suggestion.description).not.toContain('标签页');
    expect(chromeMock.omnibox.setDefaultSuggestion).toHaveBeenCalledWith({
      description: 'Search "x" · 1 match',
    });
  });

  it('选中标签页 → 聚焦其窗口并激活该 tab', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.omnibox.onInputEntered.emit('tab:7', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.windows.update).toHaveBeenCalled());
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(7, { active: true });
  });

  it('选中稍后阅读条目（currentTab）→ 当前 tab 导航并从清单移除', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [{ id: 'r1', url: 'https://a.com/', title: 'A', savedAt: 1 }];
    chromeMock.omnibox.onInputEntered.emit('read:r1', 'currentTab');
    await vi.waitFor(() =>
      expect(chromeMock.tabs.update).toHaveBeenCalledWith(undefined, { url: 'https://a.com/' }),
    );
    expect(storageData.readLater).toEqual([]);
  });

  it('选中稍后阅读条目（非 currentTab）→ 新建 tab 并从清单移除', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [{ id: 'r1', url: 'https://a.com/', title: 'A', savedAt: 1 }];
    chromeMock.omnibox.onInputEntered.emit('read:r1', 'newForegroundTab');
    await vi.waitFor(() =>
      expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'https://a.com/' }),
    );
    expect(storageData.readLater).toEqual([]);
  });

  it('稍后阅读条目已被移除：removeReadLater 为空操作，不报错', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [];
    chromeMock.omnibox.onInputEntered.emit('read:missing', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.tabs.update).not.toHaveBeenCalled());
    expect(storageData.readLater).toEqual([]);
  });

  it('选中会话 → 恢复到新窗口，会话仍保留在列表中', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.sessions = [
      { id: 's1', name: 'Demo', createdAt: 1, tabs: [{ url: 'https://a.com/', title: 'A' }] },
    ];
    chromeMock.omnibox.onInputEntered.emit('session:s1', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.windows.create).toHaveBeenCalled());
    expect(storageData.sessions).toHaveLength(1);
  });

  it('无法解析的 content（用户直接回车执行默认建议）→ 打开管理页', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.omnibox.onInputEntered.emit('mv3', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.tabs.create).toHaveBeenCalled());
  });

  it('每次输入都重新读取数据，不使用上一次的缓存', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, title: 'x 一' })]);
    chromeMock.omnibox.onInputChanged.emit('x', vi.fn());
    await vi.waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalledTimes(1));
    chromeMock.tabs.query.mockResolvedValue([]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0]).toHaveLength(0);
  });
});
