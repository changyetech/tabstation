# tabstage 子计划：纯函数层（--lib）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TDD 实现全部核心业务规则纯函数：URL 归一化、重复组识别与去重计划、域名/窗口分组、相对时间。

**Architecture:** 全部为无副作用纯函数，输入 `chrome.tabs.Tab[]` 等数据、输出数据；不触碰 chrome API。规则来源：spec §5.6（去重）、§5.7（域名视图）、§5.9（最后浏览时间）、§4.3（管理页隐身、窗口排序）。

**Tech Stack:** TypeScript + Vitest（无需 DOM）。

**Depends on:** `--scaffold`（测试 harness、`makeTab` 工厂）。

## Global Constraints

- `normalizeUrl` 是全项目唯一 URL 归一化实现，其他模块只能导入不得自写
- 注释用简体中文；先写失败测试

---

### Task 1: URL 归一化 `src/lib/url.ts`

**Files:**
- Create: `src/lib/url.ts`
- Test: `src/lib/url.test.ts`

**Interfaces:**
- Produces: `normalizeUrl(url: string): string` —— `--storage-hooks`（稍后阅读判重）与本计划 Task 2 消费

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('去掉 hash 及之后部分', () => {
    expect(normalizeUrl('https://a.com/p#sec')).toBe('https://a.com/p');
  });
  it('无 hash 原样返回（含 query）', () => {
    expect(normalizeUrl('https://a.com/p?q=1')).toBe('https://a.com/p?q=1');
  });
  it('hash 在 query 之后也整体去掉', () => {
    expect(normalizeUrl('https://a.com/p?q=1#x')).toBe('https://a.com/p?q=1');
  });
  it('空 hash 也去掉井号', () => {
    expect(normalizeUrl('https://a.com/p#')).toBe('https://a.com/p');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/url.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// URL 归一化：去掉 hash（# 及之后），其余保持原样。
// 全项目唯一实现——去重（dedupe.ts）与稍后阅读判重（storage.ts）共用。
export function normalizeUrl(url: string): string {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/url.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/url.ts src/lib/url.test.ts
rtk git commit -m "feat(lib): URL 归一化（去 hash，全项目唯一实现）"
```

---

### Task 2: 去重 `src/lib/dedupe.ts`

**Files:**
- Create: `src/lib/dedupe.ts`
- Test: `src/lib/dedupe.test.ts`

**Interfaces:**
- Consumes: `normalizeUrl`（Task 1）、`makeTab`（scaffold）
- Produces:
  - `interface DuplicateGroup { url: string; tabs: chrome.tabs.Tab[] }`
  - `findDuplicateGroups(tabs: chrome.tabs.Tab[], managerUrl: string): DuplicateGroup[]`
  - `interface DedupePlan { keepIds: number[]; closeIds: number[] }`
  - `planDedupe(groups: DuplicateGroup[]): DedupePlan`
  - `--ui-list`（×N 徽标）与 `--ui-actions`（预览/执行）消费

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { findDuplicateGroups, planDedupe } from './dedupe';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('findDuplicateGroups', () => {
  it('归一化后相同 URL ≥2 个成组（hash 不同也算重复）', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/p#x' }),
      makeTab({ id: 2, url: 'https://a.com/p#y' }),
      makeTab({ id: 3, url: 'https://b.com/' }),
    ];
    const groups = findDuplicateGroups(tabs, MANAGER);
    expect(groups).toHaveLength(1);
    expect(groups[0].url).toBe('https://a.com/p');
    expect(groups[0].tabs.map((t) => t.id)).toEqual([1, 2]);
  });

  it('统计跨窗口（范围恒为全浏览器）', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/', windowId: 1 }),
      makeTab({ id: 2, url: 'https://a.com/', windowId: 2 }),
    ];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(1);
  });

  it('管理页不计入', () => {
    const tabs = [
      makeTab({ id: 1, url: MANAGER }),
      makeTab({ id: 2, url: MANAGER }),
    ];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(0);
  });

  it('全部成员均为 pinned 的组不算重复', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/', pinned: true }),
      makeTab({ id: 2, url: 'https://a.com/', pinned: true }),
    ];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(0);
  });
});

describe('planDedupe', () => {
  it('纯普通组：保留 lastAccessed 最新，undefined 视为最旧', () => {
    const groups = findDuplicateGroups(
      [
        makeTab({ id: 1, url: 'https://a.com/', lastAccessed: 100 }),
        makeTab({ id: 2, url: 'https://a.com/', lastAccessed: 200 }),
        makeTab({ id: 3, url: 'https://a.com/', lastAccessed: undefined }),
      ],
      MANAGER
    );
    const plan = planDedupe(groups);
    expect(plan.keepIds).toEqual([2]);
    expect(plan.closeIds.sort()).toEqual([1, 3]);
  });

  it('混合组：保留所有 pinned，关闭所有普通（无论 lastAccessed）', () => {
    const groups = findDuplicateGroups(
      [
        makeTab({ id: 1, url: 'https://a.com/', pinned: true, lastAccessed: 100 }),
        makeTab({ id: 2, url: 'https://a.com/', pinned: true, lastAccessed: 50 }),
        makeTab({ id: 3, url: 'https://a.com/', lastAccessed: 999 }),
      ],
      MANAGER
    );
    const plan = planDedupe(groups);
    expect(plan.keepIds.sort()).toEqual([1, 2]);
    expect(plan.closeIds).toEqual([3]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/dedupe.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
import { normalizeUrl } from './url';

export interface DuplicateGroup {
  url: string; // 归一化后的 URL
  tabs: chrome.tabs.Tab[];
}

// 重复组：归一化 URL 相同且 ≥2、并非全部 pinned；管理页不计入。范围 = 传入的全部 tab（全浏览器）
export function findDuplicateGroups(
  tabs: chrome.tabs.Tab[],
  managerUrl: string
): DuplicateGroup[] {
  const byUrl = new Map<string, chrome.tabs.Tab[]>();
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith(managerUrl)) continue;
    const key = normalizeUrl(tab.url);
    byUrl.set(key, [...(byUrl.get(key) ?? []), tab]);
  }
  const groups: DuplicateGroup[] = [];
  for (const [url, group] of byUrl) {
    if (group.length < 2) continue;
    if (group.every((t) => t.pinned)) continue; // 全 pinned 组不算重复
    groups.push({ url, tabs: group });
  }
  return groups;
}

export interface DedupePlan {
  keepIds: number[];
  closeIds: number[];
}

// 去重计划：混合组保留所有 pinned；纯普通组保留 lastAccessed 最新（undefined 视为最旧）
export function planDedupe(groups: DuplicateGroup[]): DedupePlan {
  const keepIds: number[] = [];
  const closeIds: number[] = [];
  for (const group of groups) {
    const pinned = group.tabs.filter((t) => t.pinned);
    if (pinned.length > 0) {
      keepIds.push(...pinned.map((t) => t.id!));
      closeIds.push(...group.tabs.filter((t) => !t.pinned).map((t) => t.id!));
    } else {
      const newest = group.tabs.reduce((a, b) =>
        (b.lastAccessed ?? -1) > (a.lastAccessed ?? -1) ? b : a
      );
      keepIds.push(newest.id!);
      closeIds.push(...group.tabs.filter((t) => t !== newest).map((t) => t.id!));
    }
  }
  return { keepIds, closeIds };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/dedupe.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/dedupe.ts src/lib/dedupe.test.ts
rtk git commit -m "feat(lib): 重复组识别与去重计划（pinned 规则）"
```

---

### Task 3: 分组与排序 `src/lib/grouping.ts`

**Files:**
- Create: `src/lib/grouping.ts`
- Test: `src/lib/grouping.test.ts`

**Interfaces:**
- Produces:
  - `visibleTabs(tabs: chrome.tabs.Tab[], managerUrl: string): chrome.tabs.Tab[]`（过滤管理页）
  - `domainGroupKey(url: string): string`（hostname，或特殊组 `'#chrome' | '#file' | '#other'`）
  - `interface DomainGroup { key: string; tabs: chrome.tabs.Tab[] }`
  - `groupByDomain(tabs: chrome.tabs.Tab[]): DomainGroup[]`（按 tab 数降序，组内保持传入顺序）
  - `sortWindowsCurrentFirst<T extends { id?: number }>(windows: T[], currentWindowId: number | undefined): T[]`
  - `--ui-list` 消费；特殊组 key 由组件映射为 i18n 文案（`#chrome`→`chrome`、`#file`→`domain.localFiles`、`#other`→`domain.other`）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { domainGroupKey, groupByDomain, sortWindowsCurrentFirst, visibleTabs } from './grouping';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('visibleTabs', () => {
  it('过滤掉管理页自身', () => {
    const tabs = [makeTab({ id: 1, url: MANAGER }), makeTab({ id: 2, url: 'https://a.com/' })];
    expect(visibleTabs(tabs, MANAGER).map((t) => t.id)).toEqual([2]);
  });
});

describe('domainGroupKey', () => {
  it('http/https 取 hostname', () => {
    expect(domainGroupKey('https://www.a.com/p')).toBe('www.a.com');
  });
  it('chrome:// 归入 #chrome', () => {
    expect(domainGroupKey('chrome://settings/')).toBe('#chrome');
  });
  it('file:// 归入 #file', () => {
    expect(domainGroupKey('file:///Users/x/a.pdf')).toBe('#file');
  });
  it('其他协议与非法 URL 归入 #other', () => {
    expect(domainGroupKey('chrome-extension://abc/page.html')).toBe('#other');
    expect(domainGroupKey('not a url')).toBe('#other');
  });
});

describe('groupByDomain', () => {
  it('按 tab 数降序，组内保持传入顺序', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://b.com/1' }),
      makeTab({ id: 2, url: 'https://a.com/1' }),
      makeTab({ id: 3, url: 'https://a.com/2' }),
    ];
    const groups = groupByDomain(tabs);
    expect(groups.map((g) => g.key)).toEqual(['a.com', 'b.com']);
    expect(groups[0].tabs.map((t) => t.id)).toEqual([2, 3]);
  });
});

describe('sortWindowsCurrentFirst', () => {
  it('当前窗口置顶，其余保持原顺序', () => {
    const wins = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(sortWindowsCurrentFirst(wins, 2).map((w) => w.id)).toEqual([2, 1, 3]);
  });
  it('currentWindowId 未知时原样返回', () => {
    const wins = [{ id: 1 }, { id: 2 }];
    expect(sortWindowsCurrentFirst(wins, undefined).map((w) => w.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/grouping.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// 管理页在一切列表与计数中隐身（spec §4.3）
export function visibleTabs(tabs: chrome.tabs.Tab[], managerUrl: string): chrome.tabs.Tab[] {
  return tabs.filter((t) => !t.url?.startsWith(managerUrl));
}

// 域名分组 key：http/https 用 hostname；chrome://、file:// 与其余协议进特殊兜底组（spec §5.7）
// '#' 不会出现在合法 hostname 中，用作特殊组前缀无碰撞
export function domainGroupKey(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.hostname;
    if (u.protocol === 'chrome:') return '#chrome';
    if (u.protocol === 'file:') return '#file';
    return '#other';
  } catch {
    return '#other';
  }
}

export interface DomainGroup {
  key: string;
  tabs: chrome.tabs.Tab[];
}

export function groupByDomain(tabs: chrome.tabs.Tab[]): DomainGroup[] {
  const map = new Map<string, chrome.tabs.Tab[]>();
  for (const tab of tabs) {
    const key = domainGroupKey(tab.url ?? '');
    map.set(key, [...(map.get(key) ?? []), tab]);
  }
  return [...map.entries()]
    .map(([key, groupTabs]) => ({ key, tabs: groupTabs }))
    .sort((a, b) => b.tabs.length - a.tabs.length);
}

// 当前窗口置顶，其余保持原顺序（Array.sort 是稳定排序）
export function sortWindowsCurrentFirst<T extends { id?: number }>(
  windows: T[],
  currentWindowId: number | undefined
): T[] {
  if (currentWindowId === undefined) return [...windows];
  return [...windows].sort(
    (a, b) => Number(b.id === currentWindowId) - Number(a.id === currentWindowId)
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/grouping.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/grouping.ts src/lib/grouping.test.ts
rtk git commit -m "feat(lib): 域名聚合与窗口排序（管理页隐身、特殊组兜底）"
```

---

### Task 4: 相对时间 `src/lib/time.ts`

**Files:**
- Create: `src/lib/time.ts`
- Test: `src/lib/time.test.ts`

**Interfaces:**
- Produces:
  - `type LastAccessedDisplay = { kind: 'missing' } | { kind: 'justNow' } | { kind: 'relative'; value: number; unit: 'minute' | 'hour' | 'day' | 'month' | 'year' }`
  - `lastAccessedDisplay(lastAccessed: number | undefined, now: number): LastAccessedDisplay`
  - `--ui-list` 的 TabRow 消费：`missing`→「—」，`justNow`→`t('time.justNow')`，`relative`→`Intl.RelativeTimeFormat(lang).format(-value, unit)`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { lastAccessedDisplay } from './time';

const NOW = 1_000_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('lastAccessedDisplay', () => {
  it('undefined → missing（UI 显示 —）', () => {
    expect(lastAccessedDisplay(undefined, NOW)).toEqual({ kind: 'missing' });
  });
  it('60 秒内 → justNow', () => {
    expect(lastAccessedDisplay(NOW - 59_000, NOW)).toEqual({ kind: 'justNow' });
  });
  it('分钟 / 小时 / 天 / 月 / 年', () => {
    expect(lastAccessedDisplay(NOW - 3 * MIN, NOW)).toEqual({ kind: 'relative', value: 3, unit: 'minute' });
    expect(lastAccessedDisplay(NOW - 2 * HOUR, NOW)).toEqual({ kind: 'relative', value: 2, unit: 'hour' });
    expect(lastAccessedDisplay(NOW - 5 * DAY, NOW)).toEqual({ kind: 'relative', value: 5, unit: 'day' });
    expect(lastAccessedDisplay(NOW - 65 * DAY, NOW)).toEqual({ kind: 'relative', value: 2, unit: 'month' });
    expect(lastAccessedDisplay(NOW - 400 * DAY, NOW)).toEqual({ kind: 'relative', value: 1, unit: 'year' });
  });
  it('未来时间（时钟偏差）按 justNow 兜底', () => {
    expect(lastAccessedDisplay(NOW + 5_000, NOW)).toEqual({ kind: 'justNow' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/time.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// 最后浏览时间展示（spec §5.9）：缺失→—；60 秒内→刚刚；其余取最大整数单位
export type LastAccessedDisplay =
  | { kind: 'missing' }
  | { kind: 'justNow' }
  | { kind: 'relative'; value: number; unit: 'minute' | 'hour' | 'day' | 'month' | 'year' };

export function lastAccessedDisplay(
  lastAccessed: number | undefined,
  now: number
): LastAccessedDisplay {
  if (lastAccessed === undefined) return { kind: 'missing' };
  const sec = Math.max(0, (now - lastAccessed) / 1000);
  if (sec < 60) return { kind: 'justNow' };
  if (sec < 3600) return { kind: 'relative', value: Math.floor(sec / 60), unit: 'minute' };
  if (sec < 86400) return { kind: 'relative', value: Math.floor(sec / 3600), unit: 'hour' };
  if (sec < 86400 * 30) return { kind: 'relative', value: Math.floor(sec / 86400), unit: 'day' };
  if (sec < 86400 * 365) return { kind: 'relative', value: Math.floor(sec / (86400 * 30)), unit: 'month' };
  return { kind: 'relative', value: Math.floor(sec / (86400 * 365)), unit: 'year' };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/time.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/time.ts src/lib/time.test.ts
rtk git commit -m "feat(lib): 最后浏览时间展示（缺失/刚刚/相对单位）"
```
