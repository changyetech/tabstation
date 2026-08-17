import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { getChromeMock } from '../test/chrome-mock';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  moveSessionTab,
  readKey,
  removeReadLater,
  removeSessionTab,
  renameSession,
  snapshotWindow,
  upsertReadLater,
  writeKey,
  type ReadLaterItem,
  type SavedSession,
} from './storage';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

const item = (over: Partial<ReadLaterItem>): ReadLaterItem => ({
  id: 'i1',
  url: 'https://a.com/',
  title: 'A',
  savedAt: 100,
  ...over,
});
const session = (over: Partial<SavedSession>): SavedSession => ({
  id: 's1',
  name: 'S',
  createdAt: 100,
  tabs: [
    { url: 'https://a.com/', title: 'A' },
    { url: 'https://b.com/', title: 'B' },
  ],
  ...over,
});

describe('upsertReadLater', () => {
  it('新 URL 追加条目', () => {
    const next = upsertReadLater([], { url: 'https://a.com/', title: 'A' }, 200, 'new-id');
    expect(next).toEqual([
      { id: 'new-id', url: 'https://a.com/', title: 'A', favIconUrl: undefined, savedAt: 200 },
    ]);
  });
  it('归一化后同 URL（hash 不同）只更新 savedAt，不产生重复条目', () => {
    const list = [item({ url: 'https://a.com/p#x', savedAt: 100 })];
    const next = upsertReadLater(list, { url: 'https://a.com/p#y', title: 'A2' }, 200, 'new-id');
    expect(next).toHaveLength(1);
    expect(next[0].savedAt).toBe(200);
    expect(next[0].id).toBe('i1');
  });
});

describe('removeReadLater', () => {
  it('按 id 删除', () => {
    expect(removeReadLater([item({ id: 'x' }), item({ id: 'y' })], 'x').map((i) => i.id)).toEqual([
      'y',
    ]);
  });
});

describe('snapshotWindow', () => {
  it('排除管理页与 chrome://，记录 pinned', () => {
    const tabs = [
      makeTab({ url: MANAGER }),
      makeTab({ url: 'chrome://settings/' }),
      makeTab({ url: 'https://a.com/', title: 'A', pinned: true }),
      makeTab({ url: 'https://b.com/', title: 'B' }),
    ];
    expect(snapshotWindow(tabs, MANAGER)).toEqual([
      { url: 'https://a.com/', title: 'A', favIconUrl: undefined, pinned: true },
      { url: 'https://b.com/', title: 'B', favIconUrl: undefined },
    ]);
  });
  it('全被排除时返回空数组（调用方据此不创建会话并 toast）', () => {
    expect(snapshotWindow([makeTab({ url: 'chrome://history/' })], MANAGER)).toEqual([]);
  });

  it('结果不含新标签页 URL（自有页面前缀过滤）', () => {
    const EXT_BASE = 'chrome-extension://test-id/';
    const tabs = [
      makeTab({ url: EXT_BASE + 'src/newtab/index.html' }),
      makeTab({ url: 'https://a.com/', title: 'A' }),
    ];
    expect(snapshotWindow(tabs, EXT_BASE)).toEqual([
      { url: 'https://a.com/', title: 'A', favIconUrl: undefined },
    ]);
  });
});

describe('会话条目操作', () => {
  it('removeSessionTab 删指定下标', () => {
    const next = removeSessionTab([session({})], 's1', 0);
    expect(next[0].tabs.map((t) => t.url)).toEqual(['https://b.com/']);
  });
  it('removeSessionTab 删到空 → 整个会话消亡', () => {
    const s = session({ tabs: [{ url: 'https://a.com/', title: 'A' }] });
    expect(removeSessionTab([s], 's1', 0)).toEqual([]);
  });
  it('renameSession 改名', () => {
    expect(renameSession([session({})], 's1', '新名')[0].name).toBe('新名');
  });
  it('操作只影响目标会话', () => {
    const other = session({ id: 's2' });
    expect(removeSessionTab([session({}), other], 's1', 0)[1]).toEqual(other);
  });
  it('moveSessionTab 同会话：重排条目', () => {
    const next = moveSessionTab([session({})], 's1', 0, 's1', 1);
    expect(next[0].tabs.map((t) => t.url)).toEqual(['https://b.com/', 'https://a.com/']);
  });
  it('moveSessionTab 跨会话：源删除、目标落点插入', () => {
    const a = session({});
    const b = session({ id: 's2', tabs: [{ url: 'https://c.com/', title: 'C' }] });
    const next = moveSessionTab([a, b], 's1', 0, 's2', 0);
    expect(next[0].tabs.map((t) => t.url)).toEqual(['https://b.com/']);
    expect(next[1].tabs.map((t) => t.url)).toEqual(['https://a.com/', 'https://c.com/']);
  });
  it('moveSessionTab 跨会话拖空 → 源会话消亡', () => {
    const a = session({ tabs: [{ url: 'https://x.com/', title: 'X' }] });
    const b = session({ id: 's2' });
    const next = moveSessionTab([a, b], 's1', 0, 's2', 2);
    expect(next.map((s) => s.id)).toEqual(['s2']);
    expect(next[0].tabs.map((t) => t.url)).toEqual([
      'https://a.com/',
      'https://b.com/',
      'https://x.com/',
    ]);
  });
  it('moveSessionTab 同会话 from === to → 原样返回', () => {
    const list = [session({})];
    expect(moveSessionTab(list, 's1', 1, 's1', 1)).toBe(list);
  });
  it('moveSessionTab 下标越界或 id 不存在 → 原样返回', () => {
    const list = [session({})];
    expect(moveSessionTab(list, 's1', 5, 's1', 0)).toBe(list);
    expect(moveSessionTab(list, 's1', 0, 's1', 5)).toBe(list);
    expect(moveSessionTab(list, 'nope', 0, 's1', 0)).toBe(list);
    expect(moveSessionTab(list, 's1', 0, 'nope', 0)).toBe(list);
  });
});

describe('storage IO', () => {
  it('readKey：key 不存在时返回 fallback', async () => {
    const fallback = {
      managerPageScope: 'global' as const,
      closeWindowAfterSave: false,
      language: 'auto' as const,
    };
    expect(await readKey('settings', fallback)).toEqual(fallback);
  });

  it('readKey：key 存在时返回存储的值', async () => {
    const { storageData } = getChromeMock();
    const stored = [item({ id: 'stored' })];
    storageData.readLater = stored;
    expect(await readKey('readLater', [])).toEqual(stored);
  });

  it('writeKey：写入后落入 storageData，且 readKey 能读回', async () => {
    const { storageData } = getChromeMock();
    const sessions = [session({})];
    await writeKey('sessions', sessions);
    expect(storageData.sessions).toEqual(sessions);
    expect(await readKey('sessions', [])).toEqual(sessions);
  });
});

describe('mergeSettings', () => {
  it('undefined 返回全默认', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
  it('旧版本落盘数据缺新字段时补默认值，已有字段保留', () => {
    const merged = mergeSettings({
      managerPageScope: 'per-window',
      closeWindowAfterSave: true,
      language: 'en',
    });
    expect(merged).toEqual({
      managerPageScope: 'per-window',
      closeWindowAfterSave: true,
      language: 'en',
      theme: 'auto',
      newWindowMode: 'same',
      visibleTabs: 12,
    });
  });
});
