# Tab Station 子计划：存储与 hooks（--storage-hooks）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现三个存储键的数据模型与纯操作（spec §6、§5.4、§5.5）、storage IO 薄层、`useStorageState`（onChanged 跨页同步）、`useTabs`（事件驱动刷新）。

**Architecture:** 业务规则（判重合并、快照过滤、会话条目增删排序）全部是纯函数进 `src/lib/storage.ts`（TDD）；IO 只有 `readKey/writeKey` 两个薄封装。`useTabs` 采用「事件触发全量重查」实现 spec 的事件驱动刷新——tab 数量级下全量 query 成本可忽略，增量 diff 只增加复杂度（简单优先）。

**Tech Stack:** TypeScript + Vitest + Testing Library `renderHook` + chrome mock。

**Depends on:** `--scaffold`、`--lib`（`normalizeUrl`）。

## Global Constraints

- 存储键仅 `readLater` / `sessions` / `settings` 三个，全部 `chrome.storage.local`
- 稍后阅读判重必须复用 `normalizeUrl`
- 注释用简体中文；先写失败测试

---

### Task 1: 数据模型与纯操作 `src/lib/storage.ts`

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `normalizeUrl`（--lib）
- Produces（全部 UI 子计划消费）:
  - `interface ReadLaterItem { id: string; url: string; title: string; favIconUrl?: string; savedAt: number }`
  - `interface SessionTab { url: string; title: string; favIconUrl?: string; pinned?: boolean }`
  - `interface SavedSession { id: string; name: string; createdAt: number; tabs: SessionTab[] }`
  - `interface Settings { managerPageScope: 'global' | 'per-window'; closeWindowAfterSave: boolean; language: 'auto' | 'en' | 'zh-CN' }`
  - `DEFAULT_SETTINGS: Settings`
  - `upsertReadLater(list, tab: { url; title; favIconUrl? }, now: number, newId: string): ReadLaterItem[]`
  - `removeReadLater(list, id: string): ReadLaterItem[]`
  - `snapshotWindow(tabs: chrome.tabs.Tab[], managerUrl: string): SessionTab[]`
  - `removeSessionTab(sessions, sessionId: string, index: number): SavedSession[]`（删空自动删会话）
  - `reorderSessionTab(sessions, sessionId: string, from: number, to: number): SavedSession[]`
  - `renameSession(sessions, sessionId: string, name: string): SavedSession[]`
  - `readKey<T>(key: 'readLater' | 'sessions' | 'settings', fallback: T): Promise<T>`
  - `writeKey<T>(key: 'readLater' | 'sessions' | 'settings', value: T): Promise<void>`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import {
  removeReadLater, removeSessionTab, renameSession, reorderSessionTab,
  snapshotWindow, upsertReadLater, type ReadLaterItem, type SavedSession,
} from './storage';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

const item = (over: Partial<ReadLaterItem>): ReadLaterItem => ({
  id: 'i1', url: 'https://a.com/', title: 'A', savedAt: 100, ...over,
});
const session = (over: Partial<SavedSession>): SavedSession => ({
  id: 's1', name: 'S', createdAt: 100,
  tabs: [
    { url: 'https://a.com/', title: 'A' },
    { url: 'https://b.com/', title: 'B' },
  ],
  ...over,
});

describe('upsertReadLater', () => {
  it('新 URL 追加条目', () => {
    const next = upsertReadLater([], { url: 'https://a.com/', title: 'A' }, 200, 'new-id');
    expect(next).toEqual([{ id: 'new-id', url: 'https://a.com/', title: 'A', favIconUrl: undefined, savedAt: 200 }]);
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
    expect(removeReadLater([item({ id: 'x' }), item({ id: 'y' })], 'x').map((i) => i.id)).toEqual(['y']);
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
  it('reorderSessionTab 移动条目', () => {
    const next = reorderSessionTab([session({})], 's1', 0, 1);
    expect(next[0].tabs.map((t) => t.url)).toEqual(['https://b.com/', 'https://a.com/']);
  });
  it('renameSession 改名', () => {
    expect(renameSession([session({})], 's1', '新名')[0].name).toBe('新名');
  });
  it('操作只影响目标会话', () => {
    const other = session({ id: 's2' });
    expect(removeSessionTab([session({}), other], 's1', 0)[1]).toEqual(other);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/storage.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
import { normalizeUrl } from './url';

// ===== 数据模型（spec §6）=====

export interface ReadLaterItem {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  savedAt: number;
}

export interface SessionTab {
  url: string;
  title: string;
  favIconUrl?: string;
  pinned?: boolean;
}

export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: SessionTab[];
}

export interface Settings {
  managerPageScope: 'global' | 'per-window';
  closeWindowAfterSave: boolean;
  language: 'auto' | 'en' | 'zh-CN';
}

export const DEFAULT_SETTINGS: Settings = {
  managerPageScope: 'global',
  closeWindowAfterSave: false,
  language: 'auto',
};

// ===== 稍后阅读纯操作（spec §5.4）=====

// 归一化后同 URL 只更新 savedAt（不重复）；否则追加
export function upsertReadLater(
  list: ReadLaterItem[],
  tab: { url: string; title: string; favIconUrl?: string },
  now: number,
  newId: string
): ReadLaterItem[] {
  const key = normalizeUrl(tab.url);
  const existing = list.find((i) => normalizeUrl(i.url) === key);
  if (existing) return list.map((i) => (i === existing ? { ...i, savedAt: now } : i));
  return [...list, { id: newId, url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, savedAt: now }];
}

export function removeReadLater(list: ReadLaterItem[], id: string): ReadLaterItem[] {
  return list.filter((i) => i.id !== id);
}

// ===== 会话纯操作（spec §5.5）=====

// 快照过滤：排除管理页自身与 chrome://；记录 pinned
export function snapshotWindow(tabs: chrome.tabs.Tab[], managerUrl: string): SessionTab[] {
  return tabs
    .filter((t) => t.url && !t.url.startsWith(managerUrl) && !t.url.startsWith('chrome://'))
    .map((t) => ({
      url: t.url!,
      title: t.title ?? t.url!,
      favIconUrl: t.favIconUrl,
      ...(t.pinned ? { pinned: true as const } : {}),
    }));
}

// 删条目；删到空自动删除整个会话（不留空会话）
export function removeSessionTab(
  sessions: SavedSession[],
  sessionId: string,
  index: number
): SavedSession[] {
  return sessions.flatMap((s) => {
    if (s.id !== sessionId) return [s];
    const tabs = s.tabs.filter((_, i) => i !== index);
    return tabs.length === 0 ? [] : [{ ...s, tabs }];
  });
}

export function reorderSessionTab(
  sessions: SavedSession[],
  sessionId: string,
  from: number,
  to: number
): SavedSession[] {
  return sessions.map((s) => {
    if (s.id !== sessionId) return s;
    const tabs = [...s.tabs];
    const [moved] = tabs.splice(from, 1);
    tabs.splice(to, 0, moved);
    return { ...s, tabs };
  });
}

export function renameSession(
  sessions: SavedSession[],
  sessionId: string,
  name: string
): SavedSession[] {
  return sessions.map((s) => (s.id === sessionId ? { ...s, name } : s));
}

// ===== storage IO 薄层 =====

export type StorageKey = 'readLater' | 'sessions' | 'settings';

export async function readKey<T>(key: StorageKey, fallback: T): Promise<T> {
  const res = await chrome.storage.local.get(key);
  return (res[key] as T | undefined) ?? fallback;
}

export async function writeKey<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/storage.ts src/lib/storage.test.ts
rtk git commit -m "feat(lib): 存储数据模型与纯操作（稍后阅读/会话/设置）"
```

---

### Task 2: `useStorageState`（onChanged 跨页同步）

**Files:**
- Create: `src/hooks/useStorageState.ts`
- Test: `src/hooks/useStorageState.test.ts`

**Interfaces:**
- Consumes: `readKey/writeKey/StorageKey`（Task 1）
- Produces: `useStorageState<T>(key: StorageKey, fallback: T): [T, (next: T) => Promise<void>]` —— 挂载时读一次；`chrome.storage.onChanged` 到达时同步；写入先更新本地 state 再落盘

- [ ] **Step 1: 写失败测试**

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { useStorageState } from './useStorageState';

describe('useStorageState', () => {
  it('挂载时读取已存值，无值用 fallback', async () => {
    const { storageData } = getChromeMock();
    storageData.readLater = [{ id: 'x' }];
    const { result } = renderHook(() => useStorageState<unknown[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([{ id: 'x' }]));
  });

  it('write 更新 state 并写入 storage', async () => {
    const { storageData } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('sessions' as never, [] as never)) as never as {
      current: [string[], (v: string[]) => Promise<void>];
    };
    // 说明：泛型走 StorageKey，测试里直接用 sessions 键
    await act(() => (result.current as [string[], (v: string[]) => Promise<void>])[1](['a']));
    expect((result.current as [string[], unknown])[0]).toEqual(['a']);
    expect(storageData.sessions).toEqual(['a']);
  });

  it('其他页面写入（onChanged）→ 本页自动同步', async () => {
    const { chromeMock } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([]));
    act(() => {
      chromeMock.storage.onChanged.emit({ readLater: { newValue: ['remote'] } }, 'local');
    });
    expect(result.current[0]).toEqual(['remote']);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/hooks/useStorageState.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
import { useCallback, useEffect, useState } from 'react';
import { readKey, writeKey, type StorageKey } from '../lib/storage';

// storage.local 读写 + onChanged 跨页同步（spec §6「多管理页一致性」）
export function useStorageState<T>(
  key: StorageKey,
  fallback: T
): [T, (next: T) => Promise<void>] {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    void readKey(key, fallback).then((v) => {
      if (alive) setValue(v);
    });
    const listener = (
      changes: Record<string, { newValue?: unknown }>,
      area: string
    ) => {
      if (area === 'local' && key in changes) {
        setValue((changes[key].newValue as T | undefined) ?? fallback);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
    // fallback 视为常量（调用方传字面量），不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const write = useCallback(
    async (next: T) => {
      setValue(next);
      await writeKey(key, next);
    },
    [key]
  );

  return [value, write];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/hooks/useStorageState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useStorageState.ts src/hooks/useStorageState.test.ts
rtk git commit -m "feat(hooks): useStorageState（onChanged 跨页同步）"
```

---

### Task 3: `useTabs`（事件驱动刷新）

**Files:**
- Create: `src/hooks/useTabs.ts`
- Test: `src/hooks/useTabs.test.ts`

**Interfaces:**
- Produces: `useTabs(): { tabs: chrome.tabs.Tab[]; windows: chrome.windows.Window[]; currentWindowId: number | undefined }` —— 挂载时全量拉取；任一 tabs/windows 事件触发重查；卸载时移除监听。`--ui-list` 的 App 消费

- [ ] **Step 1: 写失败测试**

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import { useTabs } from './useTabs';

describe('useTabs', () => {
  it('挂载时全量拉取 tabs/windows/currentWindowId', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1 })]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    const { result } = renderHook(() => useTabs());
    await waitFor(() => {
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.windows).toHaveLength(1);
      expect(result.current.currentWindowId).toBe(1);
    });
  });

  it('tabs 事件触发重查', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toEqual([]));

    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 2 })]);
    await act(async () => {
      chromeMock.tabs.onCreated.emit(makeTab({ id: 2 }) as never);
    });
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
  });

  it('卸载后移除全部监听', async () => {
    const { chromeMock } = getChromeMock();
    const { unmount } = renderHook(() => useTabs());
    await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
    unmount();
    const before = chromeMock.tabs.query.mock.calls.length;
    await act(async () => {
      chromeMock.tabs.onRemoved.emit(1 as never, {} as never);
    });
    expect(chromeMock.tabs.query.mock.calls.length).toBe(before);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/hooks/useTabs.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
import { useEffect, useState } from 'react';

// 运行时数据不落盘：Chrome 是唯一数据源（spec §6）。
// 事件触发全量重查——tab 数量级下 query 成本可忽略，增量 diff 只增复杂度。
export function useTabs(): {
  tabs: chrome.tabs.Tab[];
  windows: chrome.windows.Window[];
  currentWindowId: number | undefined;
} {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);
  const [currentWindowId, setCurrentWindowId] = useState<number>();

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [allTabs, allWindows, current] = await Promise.all([
        chrome.tabs.query({}),
        chrome.windows.getAll(),
        chrome.windows.getCurrent(),
      ]);
      if (!alive) return;
      setTabs(allTabs);
      setWindows(allWindows);
      setCurrentWindowId(current.id);
    };
    void refresh();

    const events = [
      chrome.tabs.onCreated, chrome.tabs.onRemoved, chrome.tabs.onUpdated,
      chrome.tabs.onMoved, chrome.tabs.onActivated, chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.windows.onCreated, chrome.windows.onRemoved, chrome.windows.onFocusChanged,
    ];
    const handler = () => void refresh();
    events.forEach((e) => e.addListener(handler));
    return () => {
      alive = false;
      events.forEach((e) => e.removeListener(handler));
    };
  }, []);

  return { tabs, windows, currentWindowId };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/hooks/useTabs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useTabs.ts src/hooks/useTabs.test.ts
rtk git commit -m "feat(hooks): useTabs（全量拉取 + 事件驱动刷新）"
```
