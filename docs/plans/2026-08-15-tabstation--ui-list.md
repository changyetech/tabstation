# Tab Station 子计划：列表 UI 与拖拽（--ui-list）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现管理页主体：App 骨架（模式×视图）、Toolbar、WindowSection、TabRow、全部模式、域名视图、窗口模式×列表视图的拖拽（spec §4.3、§4.4、§5.1、§5.2、§5.7）。

**Architecture:** 自底向上：先 TDD 拖拽落点纯函数，再组件（TabRow → WindowSection → Toolbar → App 组装 → 域名视图）。App 持有 `rowEls` 注册表（tabId → 行元素），供关闭动效取坐标。本计划的 TabRow/Toolbar 只含本计划需要的 props——「移动到」菜单、去重按钮、稍后阅读、保存/关闭窗口按钮分别由 `--ui-actions` / `--ui-panels` 以 Modify 方式追加。

**Tech Stack:** React + dnd-kit（`@dnd-kit/core` + `@dnd-kit/sortable`）+ Testing Library。

**Depends on:** `--lib`、`--i18n`、`--storage-hooks`、`--effects`。

## Global Constraints

- 拖拽仅 dnd-kit；仅「窗口模式 × 列表视图」可拖；pinned tab 不可拖
- 管理页自身不出现在列表与计数（用 `visibleTabs` 过滤）
- 文案一律走 `useT()`，key 以 `--i18n` 字典为准
- 注释用简体中文；纯逻辑先写失败测试

---

### Task 1: 拖拽落点 `src/lib/dnd.ts`

**Files:**
- Create: `src/lib/dnd.ts`
- Test: `src/lib/dnd.test.ts`

**Interfaces:**
- Produces:
  - `interface DragTabData { tabId: number; windowId: number; index: number }`
  - `dragEndToMove(active: DragTabData, over: DragTabData | null): { tabId: number; windowId: number; index: number } | null`
  - Task 5 的 App `handleDragEnd` 消费

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { dragEndToMove } from './dnd';

describe('dragEndToMove', () => {
  it('同窗口拖动 → 目标行的真实 index', () => {
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 2, windowId: 10, index: 3 })
    ).toEqual({ tabId: 1, windowId: 10, index: 3 });
  });
  it('跨窗口拖动 → 目标窗口 + 目标行 index', () => {
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 5, windowId: 20, index: 1 })
    ).toEqual({ tabId: 1, windowId: 20, index: 1 });
  });
  it('落点为空或落回自身 → null（不移动）', () => {
    expect(dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, null)).toBeNull();
    expect(
      dragEndToMove({ tabId: 1, windowId: 10, index: 0 }, { tabId: 1, windowId: 10, index: 0 })
    ).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/dnd.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
// 拖拽落点 → chrome.tabs.move 参数（spec §5.2）
// 注：普通 tab 移到 pinned 区前方时 Chrome 会自动钳制 index，无需额外处理
export interface DragTabData {
  tabId: number;
  windowId: number;
  index: number;
}

export function dragEndToMove(
  active: DragTabData,
  over: DragTabData | null
): { tabId: number; windowId: number; index: number } | null {
  if (!over || over.tabId === active.tabId) return null;
  return { tabId: active.tabId, windowId: over.windowId, index: over.index };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/dnd.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/dnd.ts src/lib/dnd.test.ts
rtk git commit -m "feat(lib): 拖拽落点到 tabs.move 参数"
```

---

### Task 2: TabRow 组件

**Files:**
- Create: `src/components/TabRow.tsx`
- Modify: `src/manager/styles.css`（追加行样式）
- Test: `src/components/TabRow.test.tsx`

**Interfaces:**
- Consumes: `lastAccessedDisplay`（--lib）、`useT/useLanguage`（--i18n）、`DragTabData`（Task 1）
- Produces:

```ts
interface TabRowProps {
  tab: chrome.tabs.Tab;
  dupCount?: number;      // 所在重复组大小；无重复不传
  draggable: boolean;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onClose: (tab: chrome.tabs.Tab) => void;
}
export default function TabRow(props: TabRowProps): JSX.Element
```

  行内容：favicon、📌（pinned）、标题、域名、相对时间、×N 徽标、hover 操作（跳转/关闭）。`--ui-actions` 追加「移动到 ▾」与去重预览态，`--ui-panels` 追加「稍后阅读」。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab } from '../test/factories';
import TabRow from './TabRow';

// useSortable 需处于 SortableContext 内，测试包一层空列表 context
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function renderRow(ui: React.ReactElement) {
  return render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <SortableContext items={[1, 2, 5]} strategy={verticalListSortingStrategy}>
          <ul>{ui}</ul>
        </SortableContext>
      </DndContext>
    </I18nProvider>
  );
}
const noop = () => undefined;

describe('TabRow', () => {
  it('展示标题、域名、📌 与 ×N 徽标', () => {
    const tab = makeTab({
      title: 'My Page', url: 'https://www.a.com/p', pinned: true,
      lastAccessed: Date.now() - 3 * 60_000,
    });
    renderRow(<TabRow tab={tab} dupCount={2} draggable={false} registerRow={noop} onClose={noop} />);
    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.getByText('www.a.com')).toBeInTheDocument();
    expect(screen.getByText('📌')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('lastAccessed 缺失显示 —，60 秒内显示 刚刚', () => {
    const t1 = makeTab({ id: 1, lastAccessed: undefined });
    const t2 = makeTab({ id: 2, lastAccessed: Date.now() - 10_000 });
    renderRow(
      <>
        <TabRow tab={t1} draggable={false} registerRow={noop} onClose={noop} />
        <TabRow tab={t2} draggable={false} registerRow={noop} onClose={noop} />
      </>
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('跳转：聚焦所在窗口并激活 tab', async () => {
    const { chromeMock } = getChromeMock();
    const tab = makeTab({ id: 5, windowId: 3 });
    renderRow(<TabRow tab={tab} draggable={false} registerRow={noop} onClose={noop} />);
    await userEvent.click(screen.getByTitle('跳转'));
    expect(chromeMock.windows.update).toHaveBeenCalledWith(3, { focused: true });
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(5, { active: true });
  });

  it('关闭按钮回调 onClose', async () => {
    const onClose = vi.fn();
    const tab = makeTab({ id: 5 });
    renderRow(<TabRow tab={tab} draggable={false} registerRow={noop} onClose={onClose} />);
    await userEvent.click(screen.getByTitle('关闭'));
    expect(onClose).toHaveBeenCalledWith(tab);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/TabRow.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/components/TabRow.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage, useT } from '../i18n';
import { lastAccessedDisplay } from '../lib/time';

export interface TabRowProps {
  tab: chrome.tabs.Tab;
  dupCount?: number;
  draggable: boolean;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onClose: (tab: chrome.tabs.Tab) => void;
}

function hostnameOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export default function TabRow({ tab, dupCount, draggable, registerRow, onClose }: TabRowProps) {
  const t = useT();
  const lang = useLanguage();

  // pinned 不可拖（spec §5.2）
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tab.id!,
    disabled: !draggable || tab.pinned,
    data: { tabId: tab.id!, windowId: tab.windowId, index: tab.index },
  });

  const display = lastAccessedDisplay(tab.lastAccessed, Date.now());
  const timeText =
    display.kind === 'missing'
      ? '—'
      : display.kind === 'justNow'
        ? t('time.justNow')
        : new Intl.RelativeTimeFormat(lang).format(-display.value, display.unit);

  const activate = async () => {
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id!, { active: true });
  };

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        registerRow(tab.id!, el);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="tab-row"
      {...attributes}
      {...listeners}
    >
      {tab.favIconUrl ? (
        <img className="favicon" src={tab.favIconUrl} alt="" />
      ) : (
        <span className="favicon favicon-placeholder" />
      )}
      {tab.pinned && <span className="pin">📌</span>}
      <span className="title">{tab.title}</span>
      <span className="domain">{hostnameOf(tab.url)}</span>
      <span className="time">{timeText}</span>
      {dupCount !== undefined && <span className="dup-badge">{t('dup.badge', { n: dupCount })}</span>}
      <span className="actions">
        <button title={t('tab.activate')} onClick={() => void activate()}>↗</button>
        <button title={t('tab.close')} onClick={() => onClose(tab)}>✕</button>
      </span>
    </li>
  );
}
```

`src/manager/styles.css` 追加：

```css
.tab-row { display: flex; align-items: center; gap: 8px; padding: 6px 12px; list-style: none; }
.tab-row:hover { background: #f4f4f4; }
.tab-row .favicon { width: 16px; height: 16px; flex: none; }
.favicon-placeholder { display: inline-block; background: #ddd; border-radius: 3px; }
.tab-row .title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tab-row .domain, .tab-row .time { color: #888; font-size: 12px; flex: none; }
.dup-badge { color: #b35a5a; font-size: 12px; border: 1px solid #b35a5a; border-radius: 8px; padding: 0 6px; }
.tab-row .actions { visibility: hidden; display: flex; gap: 4px; }
.tab-row:hover .actions { visibility: visible; }
.tab-row .actions button { border: none; background: none; cursor: pointer; }
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/components/TabRow.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/TabRow.tsx src/components/TabRow.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): TabRow（字段/📌/×N 徽标/跳转/关闭）"
```

---

### Task 3: WindowSection 组件

**Files:**
- Create: `src/components/WindowSection.tsx`
- Test: `src/components/WindowSection.test.tsx`

**Interfaces:**
- Consumes: `TabRow`（Task 2）
- Produces:

```ts
interface WindowSectionProps {
  window: chrome.windows.Window;
  windowNumber: number;             // 按 windows.getAll 顺序的临时序号
  tabs: chrome.tabs.Tab[];          // 已过滤管理页、已按 index 排序
  isCurrent: boolean;
  draggable: boolean;
  dupCountByTabId: Map<number, number>;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: chrome.tabs.Tab) => void;
}
export default function WindowSection(props: WindowSectionProps): JSX.Element
```

  标题格式：`窗口 N（当前窗口） · <活动 tab 标题> (M 个 tab)`。`--ui-actions` 追加 [✕ 关闭窗口]，`--ui-panels` 追加 [💾 保存窗口]。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab, makeWindow } from '../test/factories';
import WindowSection from './WindowSection';

const noop = () => undefined;

function renderSection(props: Partial<React.ComponentProps<typeof WindowSection>> = {}) {
  const tabs = [
    makeTab({ id: 1, title: 'Active Doc', active: true, index: 0 }),
    makeTab({ id: 2, title: 'Other', index: 1 }),
  ];
  return render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <WindowSection
          window={makeWindow({ id: 1 })}
          windowNumber={2}
          tabs={tabs}
          isCurrent={false}
          draggable={false}
          dupCountByTabId={new Map()}
          registerRow={noop}
          onCloseTab={noop}
          {...props}
        />
      </DndContext>
    </I18nProvider>
  );
}

describe('WindowSection', () => {
  it('标题 = 窗口 N · 活动 tab 标题 (M 个 tab)', () => {
    renderSection();
    expect(screen.getByRole('heading')).toHaveTextContent('窗口 2 · Active Doc (2 个 tab)');
  });
  it('当前窗口带（当前窗口）标记', () => {
    renderSection({ isCurrent: true });
    expect(screen.getByRole('heading')).toHaveTextContent('窗口 2（当前窗口） · Active Doc (2 个 tab)');
  });
  it('渲染全部行', () => {
    renderSection();
    expect(screen.getByText('Active Doc')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/WindowSection.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/components/WindowSection.tsx`**

```tsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useT } from '../i18n';
import TabRow from './TabRow';

export interface WindowSectionProps {
  window: chrome.windows.Window;
  windowNumber: number;
  tabs: chrome.tabs.Tab[];
  isCurrent: boolean;
  draggable: boolean;
  dupCountByTabId: Map<number, number>;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: chrome.tabs.Tab) => void;
}

export default function WindowSection({
  window: win, windowNumber, tabs, isCurrent, draggable,
  dupCountByTabId, registerRow, onCloseTab,
}: WindowSectionProps) {
  const t = useT();
  // 窗口标识：序号 + 活动 tab 标题 + tab 数（spec §4.3）
  const activeTitle = tabs.find((x) => x.active)?.title ?? tabs[0]?.title ?? '';
  const label = `${t('window.label', { n: windowNumber })}${isCurrent ? t('window.current') : ''} · ${activeTitle} (${t('window.tabCount', { n: tabs.length })})`;

  return (
    <section className="window-section" data-window-id={win.id}>
      <header className="window-header">
        <h2>{label}</h2>
      </header>
      <SortableContext items={tabs.map((x) => x.id!)} strategy={verticalListSortingStrategy}>
        <ul className="tab-list">
          {tabs.map((tab) => (
            <TabRow
              key={tab.id}
              tab={tab}
              dupCount={dupCountByTabId.get(tab.id!)}
              draggable={draggable}
              registerRow={registerRow}
              onClose={onCloseTab}
            />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/components/WindowSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/WindowSection.tsx src/components/WindowSection.test.tsx
rtk git commit -m "feat(ui): WindowSection（窗口标识 + 行列表）"
```

---

### Task 4: Toolbar 组件

**Files:**
- Create: `src/components/Toolbar.tsx`
- Test: `src/components/Toolbar.test.tsx`

**Interfaces:**
- Produces:

```ts
export type Mode = 'window' | 'all';
export type View = 'list' | 'domain';
interface ToolbarProps {
  mode: Mode; view: View;
  onMode: (m: Mode) => void; onView: (v: View) => void;
}
export default function Toolbar(props: ToolbarProps): JSX.Element
```

  含模式切换、视图切换、[🕘历史]。`--ui-actions` 追加 [一键去重]（含 hover 事件），`--ui-panels` 追加 [⚙设置]。`Mode`/`View` 类型从本文件导出，App 复用。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { getChromeMock } from '../test/chrome-mock';
import Toolbar from './Toolbar';

function renderToolbar(over: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props = { mode: 'window' as const, view: 'list' as const, onMode: vi.fn(), onView: vi.fn(), ...over };
  render(
    <I18nProvider language="zh-CN">
      <Toolbar {...props} />
    </I18nProvider>
  );
  return props;
}

describe('Toolbar', () => {
  it('切换模式与视图', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByText('全部模式'));
    expect(props.onMode).toHaveBeenCalledWith('all');
    await userEvent.click(screen.getByText('域名'));
    expect(props.onView).toHaveBeenCalledWith('domain');
  });

  it('历史按钮：新 tab 打开 chrome://history', async () => {
    const { chromeMock } = getChromeMock();
    renderToolbar();
    await userEvent.click(screen.getByText(/历史/));
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'chrome://history' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/Toolbar.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/components/Toolbar.tsx`**

```tsx
import { useT } from '../i18n';

export type Mode = 'window' | 'all';
export type View = 'list' | 'domain';

export interface ToolbarProps {
  mode: Mode;
  view: View;
  onMode: (m: Mode) => void;
  onView: (v: View) => void;
}

export default function Toolbar({ mode, view, onMode, onView }: ToolbarProps) {
  const t = useT();
  const seg = (active: boolean) => `seg${active ? ' seg-active' : ''}`;
  return (
    <div className="toolbar">
      <div className="seg-group">
        <button className={seg(mode === 'window')} onClick={() => onMode('window')}>
          {t('toolbar.modeWindow')}
        </button>
        <button className={seg(mode === 'all')} onClick={() => onMode('all')}>
          {t('toolbar.modeAll')}
        </button>
      </div>
      <div className="seg-group">
        <button className={seg(view === 'list')} onClick={() => onView('list')}>
          {t('toolbar.viewList')}
        </button>
        <button className={seg(view === 'domain')} onClick={() => onView('domain')}>
          {t('toolbar.viewDomain')}
        </button>
      </div>
      <span className="toolbar-spacer" />
      {/* 历史直达入口（spec §5.8）：无内嵌面板、无 history 权限 */}
      <button onClick={() => void chrome.tabs.create({ url: 'chrome://history' })}>
        🕘 {t('toolbar.history')}
      </button>
    </div>
  );
}
```

`src/manager/styles.css` 追加：

```css
.toolbar { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #e5e5e5; position: sticky; top: 0; background: #fff; }
.toolbar-spacer { flex: 1; }
.seg-group { display: flex; border: 1px solid #ccc; border-radius: 6px; overflow: hidden; }
.seg { border: none; background: none; padding: 4px 10px; cursor: pointer; }
.seg-active { background: #e8e8e8; font-weight: 600; }
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/components/Toolbar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): Toolbar（模式/视图切换 + 历史入口）"
```

---

### Task 5: App 组装（窗口/全部模式 × 列表视图 + 拖拽接线）

**Files:**
- Modify: `src/manager/App.tsx`（替换 scaffold 桩）、`src/manager/App.test.tsx`（替换冒烟用例中对标题的断言）

**Interfaces:**
- Consumes: 前四个 Task 全部产出 + `useTabs`/`useStorageState`/`visibleTabs`/`sortWindowsCurrentFirst`/`findDuplicateGroups`/`closeTabsWithEffect`/`resolveLanguage`
- Produces: `App` 完整骨架；`registerRow`/`rowEls` 注册表；`closeTab(tab)`（走动效）。`--ui-actions`、`--ui-panels` 在此文件上继续 Modify

- [ ] **Step 1: 写失败测试（替换 `src/manager/App.test.tsx` 的 App 用例，保留 chrome mock 冒烟用例）**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import App from './App';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

function seedTwoWindows() {
  const { chromeMock } = getChromeMock();
  chromeMock.tabs.query.mockResolvedValue([
    makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
    makeTab({ id: 2, windowId: 1, index: 1, title: 'Manager', url: MANAGER }),
    makeTab({ id: 3, windowId: 2, index: 0, title: 'B1', url: 'https://b.com/', active: true }),
  ]);
  chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 }), makeWindow({ id: 2 })]);
  chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 2 }));
}

describe('App', () => {
  it('窗口模式：当前窗口置顶、管理页隐身且不计数', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2));
    const headings = screen.getAllByRole('heading', { level: 2 });
    // 当前窗口（id=2，序号 2）置顶
    expect(headings[0]).toHaveTextContent('窗口 2（当前窗口）');
    // 窗口 1 有 2 个真实 tab，但管理页隐身 → 只计 1 个
    expect(headings[1]).toHaveTextContent('(1 个 tab)');
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('全部模式：合并为一份列表（按窗口顺序 + index）', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部模式'));
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    const titles = screen.getAllByText(/^(A1|B1)$/).map((el) => el.textContent);
    expect(titles).toEqual(['A1', 'B1']);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: FAIL（App 还是桩）

- [ ] **Step 3: 实现 `src/manager/App.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Toolbar, { type Mode, type View } from '../components/Toolbar';
import WindowSection from '../components/WindowSection';
import TabRow from '../components/TabRow';
import { I18nProvider, resolveLanguage } from '../i18n';
import { useStorageState } from '../hooks/useStorageState';
import { useTabs } from '../hooks/useTabs';
import { closeTabsWithEffect } from '../lib/effects/batch';
import { findDuplicateGroups } from '../lib/dedupe';
import { dragEndToMove, type DragTabData } from '../lib/dnd';
import { sortWindowsCurrentFirst, visibleTabs } from '../lib/grouping';
import { managerUrl } from '../lib/manager-url';
import { DEFAULT_SETTINGS, type Settings } from '../lib/storage';

export default function App() {
  const { tabs, windows, currentWindowId } = useTabs();
  const [settings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
  const [mode, setMode] = useState<Mode>('window');
  const [view, setView] = useState<View>('list');
  const rowEls = useRef(new Map<number, HTMLElement>());

  const mUrl = managerUrl();
  const visible = useMemo(() => visibleTabs(tabs, mUrl), [tabs, mUrl]);
  const dupGroups = useMemo(() => findDuplicateGroups(visible, mUrl), [visible, mUrl]);
  const dupCountByTabId = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of dupGroups) for (const tab of g.tabs) m.set(tab.id!, g.tabs.length);
    return m;
  }, [dupGroups]);

  const registerRow = (tabId: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(tabId, el);
    else rowEls.current.delete(tabId);
  };

  const closeTab = (tab: chrome.tabs.Tab) =>
    void closeTabsWithEffect([{ tabId: tab.id!, el: rowEls.current.get(tab.id!) ?? null }]);

  const handleDragEnd = (e: DragEndEvent) => {
    const move = dragEndToMove(
      e.active.data.current as DragTabData,
      (e.over?.data.current as DragTabData | undefined) ?? null
    );
    if (move) void chrome.tabs.move(move.tabId, { windowId: move.windowId, index: move.index });
  };

  // 窗口序号按 getAll 顺序固定；展示时当前窗口置顶（spec §5.1）
  const numberByWindowId = useMemo(
    () => new Map(windows.map((w, i) => [w.id, i + 1])),
    [windows]
  );
  const sortedWindows = sortWindowsCurrentFirst(windows, currentWindowId);
  // 全部模式：按窗口顺序 + index 合并
  const mergedTabs = useMemo(() => {
    const order = new Map(windows.map((w, i) => [w.id, i]));
    return [...visible].sort(
      (a, b) => (order.get(a.windowId) ?? 0) - (order.get(b.windowId) ?? 0) || a.index - b.index
    );
  }, [visible, windows]);

  const language = resolveLanguage(settings.language, navigator.language);

  return (
    <I18nProvider language={language}>
      <Toolbar mode={mode} view={view} onMode={setMode} onView={setView} />
      <main className="main">
        {mode === 'window' ? (
          <DndContext onDragEnd={handleDragEnd}>
            {sortedWindows.map((w) => (
              <WindowSection
                key={w.id}
                window={w}
                windowNumber={numberByWindowId.get(w.id) ?? 0}
                tabs={visible
                  .filter((tab) => tab.windowId === w.id)
                  .sort((a, b) => a.index - b.index)}
                isCurrent={w.id === currentWindowId}
                draggable={view === 'list'}
                dupCountByTabId={dupCountByTabId}
                registerRow={registerRow}
                onCloseTab={closeTab}
              />
            ))}
          </DndContext>
        ) : (
          <SortableContext items={mergedTabs.map((x) => x.id!)} strategy={verticalListSortingStrategy}>
            <ul className="tab-list">
              {mergedTabs.map((tab) => (
                <TabRow
                  key={tab.id}
                  tab={tab}
                  dupCount={dupCountByTabId.get(tab.id!)}
                  draggable={false}
                  registerRow={registerRow}
                  onClose={closeTab}
                />
              ))}
            </ul>
          </SortableContext>
        )}
      </main>
    </I18nProvider>
  );
}
```

注：全部模式的 `SortableContext` 仅为满足 `useSortable` 必须处于 context 内的要求，`draggable={false}` 保证不可拖（spec §5.1）。域名视图在 Task 6 接入。

- [ ] **Step 4: 运行确认通过（全量，防止回归）**

Run: `pnpm vitest run`
Expected: PASS（App 新用例 + 既有用例全绿）

- [ ] **Step 5: Commit**

```bash
rtk git add src/manager/App.tsx src/manager/App.test.tsx
rtk git commit -m "feat(ui): App 组装（模式×视图骨架 + 拖拽接线 + 管理页隐身）"
```

---

### Task 6: 域名视图

**Files:**
- Create: `src/components/DomainGroupList.tsx`
- Modify: `src/manager/App.tsx`、`src/components/WindowSection.tsx`
- Test: `src/components/DomainGroupList.test.tsx`

**Interfaces:**
- Consumes: `groupByDomain`（--lib）、`TabRow`
- Produces:

```ts
interface DomainGroupListProps {
  tabs: chrome.tabs.Tab[];
  dupCountByTabId: Map<number, number>;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: chrome.tabs.Tab) => void;
}
export default function DomainGroupList(props: DomainGroupListProps): JSX.Element
```

  `WindowSectionProps` 增加 `view: View`：域名视图时分区内渲染 `DomainGroupList` 代替行列表。App 在全部模式×域名视图时直接渲染 `DomainGroupList`。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab } from '../test/factories';
import DomainGroupList from './DomainGroupList';

const noop = () => undefined;

describe('DomainGroupList', () => {
  it('按域名聚合、tab 数降序、特殊组文案', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://b.com/1', title: 'B1' }),
      makeTab({ id: 2, url: 'https://a.com/1', title: 'A1' }),
      makeTab({ id: 3, url: 'https://a.com/2', title: 'A2' }),
      makeTab({ id: 4, url: 'file:///x.pdf', title: 'F1' }),
    ];
    render(
      <I18nProvider language="zh-CN">
        <DndContext>
          <DomainGroupList tabs={tabs} dupCountByTabId={new Map()} registerRow={noop} onCloseTab={noop} />
        </DndContext>
      </I18nProvider>
    );
    const summaries = screen.getAllByRole('group').map((d) => d.querySelector('summary')?.textContent);
    expect(summaries[0]).toContain('a.com');
    expect(summaries).toEqual(
      expect.arrayContaining([expect.stringContaining('本地文件')])
    );
    expect(screen.getByText('A1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/DomainGroupList.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/components/DomainGroupList.tsx`：

```tsx
import { useT } from '../i18n';
import { groupByDomain } from '../lib/grouping';
import TabRow from './TabRow';

export interface DomainGroupListProps {
  tabs: chrome.tabs.Tab[];
  dupCountByTabId: Map<number, number>;
  registerRow: (tabId: number, el: HTMLElement | null) => void;
  onCloseTab: (tab: chrome.tabs.Tab) => void;
}

// 域名视图（spec §5.7）：按 hostname 聚合、tab 数降序、组可折叠、只读（不可拖拽）
export default function DomainGroupList({
  tabs, dupCountByTabId, registerRow, onCloseTab,
}: DomainGroupListProps) {
  const t = useT();
  const label = (key: string) =>
    key === '#chrome' ? 'chrome' : key === '#file' ? t('domain.localFiles') : key === '#other' ? t('domain.other') : key;

  return (
    <div className="domain-groups">
      {groupByDomain(tabs).map((g) => (
        <details key={g.key} open role="group" className="domain-group">
          <summary>
            {label(g.key)} ({g.tabs.length})
          </summary>
          <ul className="tab-list">
            {g.tabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                dupCount={dupCountByTabId.get(tab.id!)}
                draggable={false}
                registerRow={registerRow}
                onClose={onCloseTab}
              />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
```

`src/components/WindowSection.tsx` 修改：props 增加 `view: 'list' | 'domain'`；`view === 'domain'` 时正文渲染 `<DomainGroupList tabs={tabs} dupCountByTabId={dupCountByTabId} registerRow={registerRow} onCloseTab={onCloseTab} />` 代替 `<SortableContext>…</SortableContext>` 块（域名视图只读，spec §5.1）。

`src/manager/App.tsx` 修改：
- 给每个 `WindowSection` 传 `view={view}`
- `mode === 'all' && view === 'domain'` 分支渲染 `<DomainGroupList tabs={mergedTabs} dupCountByTabId={dupCountByTabId} registerRow={registerRow} onCloseTab={closeTab} />`

（`TabRow` 处于 `DomainGroupList` 内时不在 `SortableContext` 中——`useSortable` 需要包一层：`DomainGroupList` 的 `<ul>` 外包 `<SortableContext items={g.tabs.map((x) => x.id!)} strategy={verticalListSortingStrategy}>`，行保持 `draggable={false}`。实现时补上该导入。）

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: 手动冒烟**

`pnpm build` 后在 Chrome 重新加载扩展：打开管理页，切换 模式×视图 四种组合，确认渲染与拖拽（仅窗口×列表可拖，拖动后真实 tab 顺序变化）。

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/DomainGroupList.tsx src/components/DomainGroupList.test.tsx src/components/WindowSection.tsx src/manager/App.tsx
rtk git commit -m "feat(ui): 域名视图（聚合/降序/折叠/只读）"
```
