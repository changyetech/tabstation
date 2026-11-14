import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from './test/chrome-mock';
import { makeTab, makeWindow } from './test/factories';
import { openManager, safeOpenManager } from './background';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('openManager', () => {
  it('同时触发两个入口只创建一个管理页', async () => {
    const { chromeMock } = getChromeMock();
    const tabs: chrome.tabs.Tab[] = [];
    chromeMock.tabs.query.mockImplementation(async () => [...tabs]);
    chromeMock.tabs.create.mockImplementation(async (props) => {
      const tab = makeTab({ id: 9, windowId: 1, ...props });
      tabs.push(tab);
      return tab;
    });

    await Promise.all([openManager(), openManager()]);

    expect(chromeMock.tabs.create).toHaveBeenCalledTimes(1);
    expect(tabs).toHaveLength(1);
  });

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
  it('并发打开两条稍后阅读不会使另一条复活', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [
      { id: 'a', url: 'https://a.com/', title: 'A', savedAt: 1 },
      { id: 'b', url: 'https://b.com/', title: 'B', savedAt: 1 },
    ];
    chromeMock.omnibox.onInputEntered.emit('read:a', 'newForegroundTab');
    chromeMock.omnibox.onInputEntered.emit('read:b', 'newForegroundTab');

    await vi.waitFor(() => expect(chromeMock.storage.local.set).toHaveBeenCalledTimes(2));

    expect(storageData.readLater).toEqual([]);
    expect(chromeMock.tabs.create).toHaveBeenCalledTimes(2);
  });

  it('空查询仅读设置用于本地化，不查询标签页和完整清单', async () => {
    const { chromeMock } = getChromeMock();
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('  ', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalledWith([]));
    expect(chromeMock.tabs.query).not.toHaveBeenCalled();
    expect(chromeMock.storage.local.get).toHaveBeenCalledWith('settings');
  });

  it('后台打开稍后阅读不抢占当前标签页', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [{ id: 'r1', url: 'https://a.com/', title: 'A', savedAt: 1 }];
    chromeMock.omnibox.onInputEntered.emit('read:r1', 'newBackgroundTab');
    await vi.waitFor(() => expect(storageData.readLater).toEqual([]));
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'https://a.com/', active: false });
  });

  it('打开稍后阅读期间的新增和删除不会被旧清单覆盖', async () => {
    const { chromeMock, storageData } = getChromeMock();
    const a = { id: 'a', url: 'https://a.com/', title: 'A', savedAt: 1 };
    const b = { ...a, id: 'b' };
    const c = { ...a, id: 'c' };
    storageData.readLater = [a, b];
    let complete!: () => void;
    chromeMock.tabs.update.mockReturnValueOnce(
      new Promise<undefined>((resolve) => {
        complete = () => resolve(undefined);
      }),
    );
    chromeMock.omnibox.onInputEntered.emit('read:a', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.tabs.update).toHaveBeenCalled());
    await chromeMock.storage.local.set({ readLater: [a, c] });

    complete();

    await vi.waitFor(() => expect(storageData.readLater).toEqual([c]));
  });

  it('建议中排除自有页面（管理页与设置页）', async () => {
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
        url: 'chrome-extension://test-id/src/settings/index.html',
        title: 'x 设置页',
      }),
    ]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0]).toHaveLength(1);
  });

  it('连续输入：先发起后 resolve 的旧输入结果被丢弃，不覆盖新输入的建议', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, title: 'x 普通页' })]);
    // 第一次输入的 storage 读取挂起，让它晚于第二次输入才 resolve
    let releaseStale!: () => void;
    chromeMock.storage.local.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseStale = () => resolve({});
        }),
    );

    const staleSuggest = vi.fn();
    const freshSuggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', staleSuggest);
    chromeMock.omnibox.onInputChanged.emit('x 普', freshSuggest);
    await vi.waitFor(() => expect(freshSuggest).toHaveBeenCalled());

    releaseStale();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(staleSuggest).not.toHaveBeenCalled();
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

  it('查询含 & 时，默认建议 description 仍是合法 XML（不被用户输入破坏）', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, title: 'test a & b' })]);
    chromeMock.omnibox.onInputChanged.emit('a & b', vi.fn());
    await vi.waitFor(() => expect(chromeMock.omnibox.setDefaultSuggestion).toHaveBeenCalled());
    const { description } = chromeMock.omnibox.setDefaultSuggestion.mock.calls[0][0];
    expect(description).toContain('&amp;');
    expect(() =>
      new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml'),
    ).not.toThrow();
    expect(
      new DOMParser()
        .parseFromString(`<x>${description}</x>`, 'text/xml')
        .querySelector('parsererror'),
    ).toBeNull();
  });

  it('settings.language 为 en 时，会话建议的标签页计数文案也译为英文', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.settings = { language: 'en' };
    storageData.sessions = [
      {
        id: 's1',
        name: 'Demo',
        createdAt: 1,
        tabs: [
          { url: 'https://a.com/', title: 'A' },
          { url: 'https://b.com/', title: 'B' },
        ],
      },
    ];
    chromeMock.tabs.query.mockResolvedValue([]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('demo', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    const [suggestion] = suggest.mock.calls[0][0];
    expect(suggestion.description).not.toContain('个标签页');
    expect(suggestion.description).toContain('2 tabs');
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
    chromeMock.tabs.get.mockResolvedValue(makeTab({ id: 7, windowId: 42 }));
    chromeMock.omnibox.onInputEntered.emit('tab:7', 'currentTab');
    await vi.waitFor(() =>
      expect(chromeMock.windows.update).toHaveBeenCalledWith(42, { focused: true }),
    );
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
      expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'https://a.com/', active: true }),
    );
    expect(storageData.readLater).toEqual([]);
  });

  it('稍后阅读条目已被移除 → 兜底打开管理页，且不写回 storage', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [];
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.omnibox.onInputEntered.emit('read:missing', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.tabs.create).toHaveBeenCalled());
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
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
