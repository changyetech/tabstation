# Tab Station 子计划：单例与 background（--background）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现管理页单例（spec §4.2）：图标点击 / 快捷键 → global/per-window 两种范围的查找-聚焦-新建。

**Architecture:** 查找逻辑是纯函数 `src/lib/singleton.ts`（TDD）；`src/background.ts` 只做 chrome API 粘合。background 是 service worker，随时休眠——不持有任何状态，每次事件都从 storage 读设置。

**Tech Stack:** TypeScript + Vitest + chrome mock。

**Depends on:** `--scaffold`（chrome mock、`manager-url.ts`）。

## Global Constraints

- background 唯一职责 = 单例逻辑，禁止加入任何状态代理
- 注释用简体中文；先写失败测试

---

### Task 1: 单例查找 `src/lib/singleton.ts`

**Files:**
- Create: `src/lib/singleton.ts`
- Test: `src/lib/singleton.test.ts`

**Interfaces:**
- Produces: `findManagerTab(tabs: chrome.tabs.Tab[], managerUrl: string, scope: 'global' | 'per-window', currentWindowId: number): chrome.tabs.Tab | undefined` —— Task 2 消费

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { findManagerTab } from './singleton';

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
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/singleton.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// 管理页单例查找（spec §4.2）：
// global 全浏览器找（优先当前窗口，减少不必要的跨窗口跳转）；per-window 仅当前窗口
export function findManagerTab(
  tabs: chrome.tabs.Tab[],
  managerUrl: string,
  scope: 'global' | 'per-window',
  currentWindowId: number
): chrome.tabs.Tab | undefined {
  const managers = tabs.filter((t) => t.url?.startsWith(managerUrl));
  const inCurrent = managers.find((t) => t.windowId === currentWindowId);
  if (scope === 'per-window') return inCurrent;
  return inCurrent ?? managers[0];
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/singleton.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/singleton.ts src/lib/singleton.test.ts
rtk git commit -m "feat(lib): 管理页单例查找（global/per-window）"
```

---

### Task 2: background 粘合 `src/background.ts`

**Files:**
- Modify: `src/background.ts`（替换 scaffold 桩）
- Test: `src/background.test.ts`

**Interfaces:**
- Consumes: `findManagerTab`（Task 1）、`MANAGER_PATH`（scaffold）
- Produces: `openManager(): Promise<void>`（导出供测试）；模块加载时注册 `action.onClicked` 与 `commands.onCommand('open-manager')`

- [ ] **Step 1: 写失败测试**

```ts
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
    storageData.settings = { managerPageScope: 'per-window', closeWindowAfterSave: false, language: 'auto' };
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 7, url: MANAGER, windowId: 2 })]);
    await openManager();
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: MANAGER, windowId: 1 });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/background.test.ts`
Expected: FAIL（`openManager` 未导出）

- [ ] **Step 3: 实现**

```ts
import { MANAGER_PATH } from './lib/manager-url';
import { findManagerTab } from './lib/singleton';

// background 唯一职责：图标点击/快捷键 → 管理页单例（spec §4.2）
// service worker 随时休眠，不持有状态——每次都从 storage 读设置
export async function openManager(): Promise<void> {
  const url = chrome.runtime.getURL(MANAGER_PATH);
  const [{ settings }, current, tabs] = await Promise.all([
    chrome.storage.local.get('settings') as Promise<{ settings?: { managerPageScope?: 'global' | 'per-window' } }>,
    chrome.windows.getLastFocused(),
    chrome.tabs.query({}),
  ]);
  const scope = settings?.managerPageScope ?? 'global';
  const existing = findManagerTab(tabs, url, scope, current.id!);
  if (existing) {
    await chrome.windows.update(existing.windowId, { focused: true });
    await chrome.tabs.update(existing.id!, { active: true });
  } else {
    await chrome.tabs.create({ url, windowId: current.id });
  }
}

chrome.action.onClicked.addListener(() => void openManager());
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-manager') void openManager();
});
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/background.test.ts`
Expected: PASS

- [ ] **Step 5: 构建验证（background 仍产出稳定文件名）**

Run: `pnpm build && rtk ls dist`
Expected: `dist/background.js` 存在

- [ ] **Step 6: Commit**

```bash
rtk git add src/background.ts src/background.test.ts
rtk git commit -m "feat(background): 图标/快捷键打开管理页单例"
```
