# tabstage 子计划：稍后阅读 / 会话 / 设置（--ui-panels）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 稍后阅读侧栏（spec §5.4）、窗口会话分区（保存/展开/编辑/恢复，spec §5.5）、设置对话框（spec §6/§7），最后跑手动验收清单（spec §9）。

**Architecture:** 继续在 `--ui-list`/`--ui-actions` 的组件上增量 Modify。稍后阅读/会话数据走 `useStorageState`（onChanged 已保证跨页同步）；所有编辑即时落盘。

**Tech Stack:** React + dnd-kit（会话条目排序）+ Testing Library。

**Depends on:** `--ui-actions`（Toast、closeWindow）、`--storage-hooks`。

## Global Constraints

- 稍后阅读仅对 `http(s)` tab 可用（pinned 与特殊 tab 隐藏该操作，spec §4.4）
- 稍后阅读条目删除只用退场动画（`animateElementOut`），无音效/纸屑/确认（spec §5.4）
- 会话编辑（排序/删除/重命名）即时写 storage，无「保存」按钮；删空自动删会话
- 文案 key 以 `--i18n` 字典为准；注释用简体中文

---

### Task 1: 稍后阅读（行操作 + 侧栏）

**Files:**
- Create: `src/components/ReadLaterSidebar.tsx`
- Modify: `src/components/TabRow.tsx`、`src/components/WindowSection.tsx`、`src/components/DomainGroupList.tsx`（透传）、`src/manager/App.tsx`、`src/manager/styles.css`
- Test: `src/components/ReadLaterSidebar.test.tsx`、`src/manager/App.test.tsx`（追加）

**Interfaces:**
- `TabRowProps` 追加：`onReadLater?: (tab: chrome.tabs.Tab) => void`——仅当传入且 `!tab.pinned` 且 `/^https?:\/\//.test(tab.url ?? '')` 时渲染「稍后阅读」按钮
- `ReadLaterSidebar`：

```ts
interface ReadLaterSidebarProps {
  items: ReadLaterItem[];
  onOpen: (item: ReadLaterItem) => void;                       // 打开即移除
  onDelete: (item: ReadLaterItem, el: HTMLElement | null) => void; // 直接删除（仅退场动画）
}
```

- App handlers：
  - `saveReadLater(tab)`：`upsertReadLater(readLater, {url,title,favIconUrl}, Date.now(), crypto.randomUUID())` 落盘 + `closeTabsWithEffect([该 tab])`（保存即关，spec §5.4）
  - `openReadLater(item)`：`chrome.tabs.create({url})` + `removeReadLater` 落盘
  - `deleteReadLater(item, el)`：`animateElementOut(el, 落盘删除)`；el 为 null 直接落盘
- 布局：`readLater.length > 0` 时才渲染侧栏（`<div className="layout">` 包住 main + aside）；空时主区域占满全宽（spec §4.3）

- [ ] **Step 1: 写失败测试**

`src/components/ReadLaterSidebar.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import ReadLaterSidebar from './ReadLaterSidebar';
import type { ReadLaterItem } from '../lib/storage';

const items: ReadLaterItem[] = [
  { id: 'r1', url: 'https://a.com/', title: 'Article A', savedAt: 100 },
];

describe('ReadLaterSidebar', () => {
  it('点击条目标题 → onOpen', async () => {
    const onOpen = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <ReadLaterSidebar items={items} onOpen={onOpen} onDelete={vi.fn()} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByText('Article A'));
    expect(onOpen).toHaveBeenCalledWith(items[0]);
  });

  it('点击 ✕ → onDelete（不触发 onOpen）', async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <ReadLaterSidebar items={items} onOpen={onOpen} onDelete={onDelete} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByTitle('删除'));
    expect(onDelete).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
```

`src/manager/App.test.tsx` 追加：

```tsx
describe('稍后阅读', () => {
  it('行内「稍后阅读」→ 落盘 + 关闭该 tab；侧栏出现', async () => {
    const { chromeMock, storageData } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
      makeTab({ id: 2, windowId: 1, index: 1, title: 'A2', url: 'https://x.com/' }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    // 侧栏无记录不渲染（标题是 h3「📚 稍后阅读」）
    expect(screen.queryByText(/稍后阅读/, { selector: 'h3' })).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByTitle('稍后阅读')[0]);
    await waitFor(() => {
      expect((storageData.readLater as unknown[]).length).toBe(1);
    });
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]), { timeout: 2000 });
    expect(screen.getByText(/稍后阅读/, { selector: 'h3' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/ReadLaterSidebar.test.tsx src/manager/App.test.tsx`
Expected: FAIL（模块/按钮不存在）

- [ ] **Step 3: 实现**

`src/components/ReadLaterSidebar.tsx`：

```tsx
import { useT } from '../i18n';
import type { ReadLaterItem } from '../lib/storage';

export interface ReadLaterSidebarProps {
  items: ReadLaterItem[];
  onOpen: (item: ReadLaterItem) => void;
  onDelete: (item: ReadLaterItem, el: HTMLElement | null) => void;
}

// 稍后阅读侧栏（spec §4.3/§5.4）：仅有记录时由 App 渲染；打开即移除；✕ 直接删除
export default function ReadLaterSidebar({ items, onOpen, onDelete }: ReadLaterSidebarProps) {
  const t = useT();
  return (
    <aside className="read-later">
      <h3>📚 {t('readLater.title')}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="read-later-item">
            {item.favIconUrl ? (
              <img className="favicon" src={item.favIconUrl} alt="" />
            ) : (
              <span className="favicon favicon-placeholder" />
            )}
            <button className="read-later-title" onClick={() => onOpen(item)}>
              {item.title}
            </button>
            <button
              className="read-later-delete"
              title={t('readLater.delete')}
              onClick={(e) => onDelete(item, (e.currentTarget.closest('li') as HTMLElement) ?? null)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

`src/components/TabRow.tsx` 修改——props 追加 `onReadLater?: (tab: chrome.tabs.Tab) => void`，操作区跳转按钮之后：

```tsx
{/* 稍后阅读仅 http(s)、非 pinned（spec §4.4） */}
{onReadLater && !tab.pinned && /^https?:\/\//.test(tab.url ?? '') && (
  <button title={t('tab.readLater')} onClick={() => onReadLater(tab)}>📚</button>
)}
```

`src/manager/App.tsx`（AppInner）修改：

```tsx
import ReadLaterSidebar from '../components/ReadLaterSidebar';
import { animateElementOut } from '../lib/effects/exit';
import { removeReadLater, upsertReadLater, type ReadLaterItem } from '../lib/storage';

const [readLater, setReadLater] = useStorageState<ReadLaterItem[]>('readLater', []);

// 保存即关 tab（spec §5.4）；同 URL 归一化合并在 upsertReadLater 内
const saveReadLater = (tab: chrome.tabs.Tab) => {
  void setReadLater(
    upsertReadLater(
      readLater,
      { url: tab.url!, title: tab.title ?? tab.url!, favIconUrl: tab.favIconUrl },
      Date.now(),
      crypto.randomUUID()
    )
  );
  void closeTabsWithEffect([{ tabId: tab.id!, el: rowEls.current.get(tab.id!) ?? null }]);
};

// 打开即移除（spec §5.4）
const openReadLater = (item: ReadLaterItem) => {
  void chrome.tabs.create({ url: item.url });
  void setReadLater(removeReadLater(readLater, item.id));
};

// 直接删除：仅退场动画，无音效/纸屑/确认（spec §5.4）
const deleteReadLater = (item: ReadLaterItem, el: HTMLElement | null) => {
  const commit = () => void setReadLater(removeReadLater(readLater, item.id));
  if (el) animateElementOut(el, commit);
  else commit();
};

// JSX：main 外包一层布局，仅有记录时渲染侧栏（spec §4.3）
// <div className="layout">
//   <main className="main">…原内容…</main>
//   {readLater.length > 0 && (
//     <ReadLaterSidebar items={readLater} onOpen={openReadLater} onDelete={deleteReadLater} />
//   )}
// </div>
// TabRow 处处传 onReadLater={saveReadLater}（经 WindowSection/DomainGroupList 透传）
```

`src/manager/styles.css` 追加：

```css
.layout { display: flex; align-items: flex-start; }
.main { flex: 1; min-width: 0; }
.read-later { width: 260px; flex: none; border-left: 1px solid #e5e5e5; padding: 12px; }
.read-later ul { list-style: none; margin: 0; padding: 0; }
.read-later-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
.read-later-title { flex: 1; text-align: left; border: none; background: none; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.read-later-delete { visibility: hidden; border: none; background: none; cursor: pointer; }
.read-later-item:hover .read-later-delete { visibility: visible; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/ReadLaterSidebar.tsx src/components/ReadLaterSidebar.test.tsx src/components/TabRow.tsx src/components/WindowSection.tsx src/components/DomainGroupList.tsx src/manager/App.tsx src/manager/App.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 稍后阅读（保存即关/打开即移除/直接删除/条件侧栏）"
```

---

### Task 2: 保存窗口 + 会话分区（列表/恢复/删除）

**Files:**
- Create: `src/components/SessionSection.tsx`
- Modify: `src/components/WindowSection.tsx`、`src/manager/App.tsx`
- Test: `src/components/SessionSection.test.tsx`、`src/manager/App.test.tsx`（追加空快照用例）

**Interfaces:**
- `WindowSectionProps` 追加：`onSaveWindow?: (win: chrome.windows.Window) => void`——header 渲染 [💾 保存窗口]（点击即保存，无弹窗）
- `SessionSection`：

```ts
interface SessionSectionProps {
  sessions: SavedSession[];
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}
```

  分区整体可折叠（`<details>`）；本 Task 实现列表行（名称 + N tabs + [打开][删除]），条目展开/编辑在 Task 3。
- App handlers：
  - `saveWindow(win)`：`snapshotWindow(该窗口 tabs 按 index 排序, mUrl)`；空 → `showToast(t('sessions.emptySnapshot'))` 且不创建；否则追加 `{ id: crypto.randomUUID(), name: Intl.DateTimeFormat(lang, {dateStyle:'short', timeStyle:'short'}).format(now), createdAt: now, tabs }` 落盘；`settings.closeWindowAfterSave` 为 true 时调用 `closeWindow(win, null)`（复用 --ui-actions 的实现：无确认、管理页豁免同样生效）
  - `restoreSession(s)`：`chrome.windows.create({ url: s.tabs.map(t => t.url), focused: true })`，随后对 `s.tabs[i].pinned` 的条目 `chrome.tabs.update(created[i].id, { pinned: true })`（还原 pinned，spec §5.5）；会话保留（模板式）

- [ ] **Step 1: 写失败测试**

`src/components/SessionSection.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import SessionSection from './SessionSection';
import type { SavedSession } from '../lib/storage';

const sessions: SavedSession[] = [
  {
    id: 's1', name: '2026/8/15 10:00', createdAt: 100,
    tabs: [
      { url: 'https://a.com/', title: 'A' },
      { url: 'https://b.com/', title: 'B' },
    ],
  },
];

function renderSection(over: Partial<React.ComponentProps<typeof SessionSection>> = {}) {
  const props = {
    sessions, onRestore: vi.fn(), onDelete: vi.fn(), onRename: vi.fn(),
    onReorderTab: vi.fn(), onDeleteTab: vi.fn(), onOpenTab: vi.fn(), ...over,
  };
  render(
    <I18nProvider language="zh-CN">
      <SessionSection {...props} />
    </I18nProvider>
  );
  return props;
}

describe('SessionSection', () => {
  it('显示会话名与 tab 数，[打开]/[删除] 回调', async () => {
    const props = renderSection();
    expect(screen.getByText(/2026\/8\/15 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/2 个 tab/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('打开'));
    expect(props.onRestore).toHaveBeenCalledWith(sessions[0]);
    await userEvent.click(screen.getByText('删除'));
    expect(props.onDelete).toHaveBeenCalledWith(sessions[0]);
  });

  it('无会话时整个分区不渲染', () => {
    renderSection({ sessions: [] });
    expect(screen.queryByText('已保存会话')).not.toBeInTheDocument();
  });
});
```

`src/manager/App.test.tsx` 追加：

```tsx
describe('保存窗口', () => {
  it('过滤后为空 → 不创建会话，toast 提示', async () => {
    const { chromeMock, storageData } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, url: 'chrome://history/', title: 'History', active: true }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/保存窗口/)).toBeInTheDocument());
    await userEvent.click(screen.getByText(/保存窗口/));
    expect(await screen.findByText('没有可保存的 tab')).toBeInTheDocument();
    expect(storageData.sessions).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/SessionSection.test.tsx src/manager/App.test.tsx`
Expected: FAIL（模块/按钮不存在）

- [ ] **Step 3: 实现**

`src/components/SessionSection.tsx`（本 Task 版本，Task 3 扩展条目展开）：

```tsx
import { useT } from '../i18n';
import type { SavedSession, SessionTab } from '../lib/storage';

export interface SessionSectionProps {
  sessions: SavedSession[];
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}

// 已保存会话分区（spec §4.3/§5.5）：可折叠；模板式，恢复不消耗
export default function SessionSection({ sessions, onRestore, onDelete }: SessionSectionProps) {
  const t = useT();
  if (sessions.length === 0) return null;
  return (
    <details open className="session-section">
      <summary>💾 {t('sessions.title')}</summary>
      <ul className="session-list">
        {sessions.map((s) => (
          <li key={s.id} className="session-row">
            <span className="session-name">{s.name}</span>
            <span className="session-count">({t('window.tabCount', { n: s.tabs.length })})</span>
            <button onClick={() => onRestore(s)}>{t('sessions.open')}</button>
            <button onClick={() => onDelete(s)}>{t('sessions.delete')}</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
```

`src/components/WindowSection.tsx` 修改——props 追加 `onSaveWindow?: (win: chrome.windows.Window) => void`，header 内关闭按钮之前：

```tsx
{onSaveWindow && (
  <button className="window-save" onClick={() => onSaveWindow(win)}>
    💾 {t('window.save')}
  </button>
)}
```

`src/manager/App.tsx`（AppInner）修改：

```tsx
import SessionSection from '../components/SessionSection';
import {
  removeSessionTab, renameSession, reorderSessionTab, snapshotWindow,
  type SavedSession, type SessionTab,
} from '../lib/storage';

const [sessions, setSessions] = useStorageState<SavedSession[]>('sessions', []);
const language = useLanguage(); // AppInner 处于 I18nProvider 内（--ui-actions Task 2 的拆分）

// 点击即保存无弹窗（spec §5.5）；空快照 → toast 且不创建
const saveWindow = (win: chrome.windows.Window) => {
  const winTabs = tabs
    .filter((x) => x.windowId === win.id)
    .sort((a, b) => a.index - b.index);
  const snapshot = snapshotWindow(winTabs, mUrl);
  if (snapshot.length === 0) {
    showToast(t('sessions.emptySnapshot'));
    return;
  }
  const now = Date.now();
  void setSessions([
    ...sessions,
    {
      id: crypto.randomUUID(),
      // 默认名 = 保存日期时间（spec §5.5）
      name: new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' }).format(now),
      createdAt: now,
      tabs: snapshot,
    },
  ]);
  // 复用关闭窗口实现：无确认；管理页豁免规则同样生效（评审 Q15 一致性）
  if (settings.closeWindowAfterSave) closeWindow(win, null);
};

// 恢复：新窗口按当前顺序全量打开并还原 pinned；会话保留（spec §5.5）
const restoreSession = async (s: SavedSession) => {
  const win = await chrome.windows.create({ url: s.tabs.map((x) => x.url), focused: true });
  const created = win.tabs ?? [];
  await Promise.all(
    s.tabs.map((st, i) =>
      st.pinned && created[i]?.id !== undefined
        ? chrome.tabs.update(created[i].id!, { pinned: true })
        : Promise.resolve(undefined)
    )
  );
};

const deleteSession = (s: SavedSession) =>
  void setSessions(sessions.filter((x) => x.id !== s.id));
const handleRename = (s: SavedSession, name: string) =>
  void setSessions(renameSession(sessions, s.id, name));
const handleReorderTab = (s: SavedSession, from: number, to: number) =>
  void setSessions(reorderSessionTab(sessions, s.id, from, to));
const handleDeleteTab = (s: SavedSession, index: number) =>
  void setSessions(removeSessionTab(sessions, s.id, index)); // 删空自动删会话（storage.ts 保证）
const openSessionTab = (tab: SessionTab) => void chrome.tabs.create({ url: tab.url });

// JSX：main 内列表之后挂
// <SessionSection sessions={sessions} onRestore={(s) => void restoreSession(s)} onDelete={deleteSession}
//   onRename={handleRename} onReorderTab={handleReorderTab} onDeleteTab={handleDeleteTab} onOpenTab={openSessionTab} />
// 窗口模式的每个 <WindowSection> 传 onSaveWindow={saveWindow}
```

`src/manager/styles.css` 追加：

```css
.session-section { margin: 16px 12px; border-top: 1px solid #e5e5e5; padding-top: 8px; }
.session-list { list-style: none; margin: 0; padding: 0; }
.session-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.session-name { font-weight: 600; }
.session-count { color: #888; font-size: 12px; }
.window-save, .window-close { border: none; background: none; cursor: pointer; color: #666; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/SessionSection.tsx src/components/SessionSection.test.tsx src/components/WindowSection.tsx src/manager/App.tsx src/manager/App.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 保存窗口与会话分区（快照过滤/空快照 toast/恢复还原 pinned）"
```

---

### Task 3: 会话展开编辑（排序 / 单删 / 单开 / 重命名）

**Files:**
- Modify: `src/components/SessionSection.tsx`、`src/manager/styles.css`
- Test: `src/components/SessionSection.test.tsx`（追加）

**Interfaces:**
- 消费 Task 2 已接线的 `onRename/onReorderTab/onDeleteTab/onOpenTab`
- 会话行可展开（`<details>`）为条目列表：dnd-kit 拖拽排序（仅同一会话内）、条目 ✕ 删除、条目标题点击打开、会话名 [重命名] 切换行内输入框（Enter/失焦提交）

- [ ] **Step 1: 写失败测试（追加）**

```tsx
describe('SessionSection 展开编辑', () => {
  it('展开显示条目；点击条目标题 → onOpenTab；点击条目 ✕ → onDeleteTab', async () => {
    const props = renderSection();
    await userEvent.click(screen.getByText(/2026\/8\/15 10:00/));
    expect(screen.getByText('A')).toBeInTheDocument();
    await userEvent.click(screen.getByText('A'));
    expect(props.onOpenTab).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByTitle('删除')[0]);
    expect(props.onDeleteTab).toHaveBeenCalledWith(sessions[0], 0);
  });

  it('重命名：切输入框，Enter 提交', async () => {
    const props = renderSection();
    await userEvent.click(screen.getByTitle('重命名'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '工作会话{Enter}');
    expect(props.onRename).toHaveBeenCalledWith(sessions[0], '工作会话');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/SessionSection.test.tsx`
Expected: FAIL（展开/重命名不存在）

- [ ] **Step 3: 实现（重写 SessionSection 内部）**

```tsx
import { useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useT } from '../i18n';
import type { SavedSession, SessionTab } from '../lib/storage';

// （SessionSectionProps 不变，见 Task 2）

// 会话条目行：同会话内可拖拽排序（spec §5.5）
function SessionTabRow({
  sessionId, tab, index, onDelete, onOpen,
}: {
  sessionId: string;
  tab: SessionTab;
  index: number;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `${sessionId}:${index}`,
    data: { index },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="session-tab-row"
      {...attributes}
      {...listeners}
    >
      {tab.favIconUrl ? (
        <img className="favicon" src={tab.favIconUrl} alt="" />
      ) : (
        <span className="favicon favicon-placeholder" />
      )}
      {tab.pinned && <span className="pin">📌</span>}
      <button className="session-tab-title" onClick={onOpen}>{tab.title}</button>
      <button className="session-tab-delete" title={t('sessions.delete')} onClick={onDelete}>✕</button>
    </li>
  );
}

interface SessionRowProps {
  session: SavedSession;
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}

function SessionRow({
  session, onRestore, onDelete, onRename, onReorderTab, onDeleteTab, onOpenTab,
}: SessionRowProps) {
  const t = useT();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(session.name);

  const commitRename = () => {
    setRenaming(false);
    if (draft.trim() && draft !== session.name) onRename(session, draft.trim());
  };

  // 拖拽结束 → 条目重排（即时落盘由 App 保证）
  const handleDragEnd = (e: DragEndEvent) => {
    const from = (e.active.data.current as { index: number }).index;
    const to = (e.over?.data.current as { index: number } | undefined)?.index;
    if (to !== undefined && from !== to) onReorderTab(session, from, to);
  };

  return (
    <li className="session-row-wrap">
      <details>
        <summary className="session-row">
          {renaming ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Enter' && commitRename()}
              onClick={(e) => e.preventDefault()}
            />
          ) : (
            <span className="session-name">{session.name}</span>
          )}
          <span className="session-count">({t('window.tabCount', { n: session.tabs.length })})</span>
          <button title={t('sessions.rename')} onClick={(e) => { e.preventDefault(); setRenaming(true); setDraft(session.name); }}>✏️</button>
          <button onClick={(e) => { e.preventDefault(); onRestore(session); }}>{t('sessions.open')}</button>
          <button onClick={(e) => { e.preventDefault(); onDelete(session); }}>{t('sessions.delete')}</button>
        </summary>
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext
            items={session.tabs.map((_, i) => `${session.id}:${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="session-tab-list">
              {session.tabs.map((tab, i) => (
                <SessionTabRow
                  key={`${session.id}:${i}`}
                  sessionId={session.id}
                  tab={tab}
                  index={i}
                  onDelete={() => onDeleteTab(session, i)}
                  onOpen={() => onOpenTab(tab)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </details>
    </li>
  );
}

export default function SessionSection({ sessions, ...handlers }: SessionSectionProps) {
  const t = useT();
  if (sessions.length === 0) return null;
  return (
    <details open className="session-section">
      <summary>💾 {t('sessions.title')}</summary>
      <ul className="session-list">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} {...handlers} />
        ))}
      </ul>
    </details>
  );
}
```

`src/manager/styles.css` 追加：

```css
.session-tab-list { list-style: none; margin: 0; padding: 0 0 0 20px; }
.session-tab-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
.session-tab-title { flex: 1; text-align: left; border: none; background: none; cursor: pointer; }
.session-tab-delete { visibility: hidden; border: none; background: none; cursor: pointer; }
.session-tab-row:hover .session-tab-delete { visibility: visible; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/SessionSection.tsx src/components/SessionSection.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 会话展开编辑（拖拽排序/单删/单开/重命名）"
```

---

### Task 4: 设置对话框

**Files:**
- Create: `src/components/SettingsDialog.tsx`
- Modify: `src/components/Toolbar.tsx`（追加 ⚙ 按钮）、`src/manager/App.tsx`
- Test: `src/components/SettingsDialog.test.tsx`

**Interfaces:**
- `ToolbarProps` 追加：`onSettings: () => void`（历史按钮之后渲染 `⚙ {t('toolbar.settings')}`）
- `SettingsDialog`：

```ts
interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onChange: (next: Settings) => void; // 即时落盘（App 用 setSettings）
  onClose: () => void;
}
```

  三个字段：`managerPageScope`（radio：global/per-window）、`closeWindowAfterSave`（checkbox）、`language`（select：auto/en/zh-CN）。语言切换立即生效（App 的 `resolveLanguage` 是响应式的）。

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { DEFAULT_SETTINGS } from '../lib/storage';
import SettingsDialog from './SettingsDialog';

describe('SettingsDialog', () => {
  it('open=false 不渲染', () => {
    const { container } = render(
      <I18nProvider language="zh-CN">
        <SettingsDialog open={false} settings={DEFAULT_SETTINGS} onChange={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('切换语言 → onChange 带新 language', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <SettingsDialog open settings={DEFAULT_SETTINGS} onChange={onChange} onClose={vi.fn()} />
      </I18nProvider>
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'zh-CN');
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, language: 'zh-CN' });
  });

  it('切换单例范围与保存后关窗', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <SettingsDialog open settings={DEFAULT_SETTINGS} onChange={onChange} onClose={vi.fn()} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByLabelText('每窗口一个'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, managerPageScope: 'per-window' });
    await userEvent.click(screen.getByLabelText('保存会话后关闭窗口'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, closeWindowAfterSave: true });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/SettingsDialog.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/components/SettingsDialog.tsx`：

```tsx
import { useT } from '../i18n';
import type { Settings } from '../lib/storage';

export interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
}

// 设置对话框（spec §6/§7）：改动即时落盘，onChanged 同步到其他管理页
export default function SettingsDialog({ open, settings, onChange, onClose }: SettingsDialogProps) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>⚙ {t('settings.title')}</h3>

        <fieldset>
          <legend>{t('settings.managerPageScope')}</legend>
          <label>
            <input
              type="radio"
              checked={settings.managerPageScope === 'global'}
              onChange={() => onChange({ ...settings, managerPageScope: 'global' })}
            />
            {t('settings.scopeGlobal')}
          </label>
          <label>
            <input
              type="radio"
              checked={settings.managerPageScope === 'per-window'}
              onChange={() => onChange({ ...settings, managerPageScope: 'per-window' })}
            />
            {t('settings.scopePerWindow')}
          </label>
        </fieldset>

        <label>
          <input
            type="checkbox"
            checked={settings.closeWindowAfterSave}
            onChange={(e) => onChange({ ...settings, closeWindowAfterSave: e.target.checked })}
          />
          {t('settings.closeWindowAfterSave')}
        </label>

        <label>
          {t('settings.language')}
          <select
            value={settings.language}
            onChange={(e) => onChange({ ...settings, language: e.target.value as Settings['language'] })}
          >
            <option value="auto">{t('settings.langAuto')}</option>
            <option value="en">{t('settings.langEn')}</option>
            <option value="zh-CN">{t('settings.langZh')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

`src/components/Toolbar.tsx` 修改——props 追加 `onSettings: () => void`，历史按钮后：

```tsx
<button onClick={onSettings}>⚙ {t('toolbar.settings')}</button>
```

`src/manager/App.tsx` 修改：

```tsx
const [settingsOpen, setSettingsOpen] = useState(false);
// useStorageState 的 setSettings 已存在（--ui-list 只读，此处补上写端）：
// const [settings, setSettings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
// Toolbar 传 onSettings={() => setSettingsOpen(true)}
// JSX 末尾：
// <SettingsDialog open={settingsOpen} settings={settings}
//   onChange={(next) => void setSettings(next)} onClose={() => setSettingsOpen(false)} />
```

`src/manager/styles.css` 追加：

```css
.dialog-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.dialog { background: #fff; border-radius: 10px; padding: 20px; min-width: 320px; display: flex; flex-direction: column; gap: 12px; }
.dialog fieldset { border: 1px solid #ddd; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/SettingsDialog.tsx src/components/SettingsDialog.test.tsx src/components/Toolbar.tsx src/manager/App.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 设置对话框（单例范围/保存后关窗/语言）"
```

---

### Task 5: 手动验收（spec §9 清单）

**Files:**
- Modify: `docs/specs/2026-08-15-tabstage-design.md`（勾选 §9 手动验收清单）

- [ ] **Step 1: 构建并装载**

Run: `make build`，`chrome://extensions` 重新加载 `dist/`。

- [ ] **Step 2: 逐条执行 spec §9 手动验收清单**

打开 `docs/specs/2026-08-15-tabstage-design.md` §9 第 3 节，从「点击图标/快捷键打开管理页」到「两个管理页互相同步」逐条操作验证，通过的在 spec 里勾选 `- [x]`。

- [ ] **Step 3: 发现问题 → 修复 → 重跑对应条目**

任何一条失败：定位（优先补一个失败的单元/组件测试复现）→ 修复 → `pnpm vitest run` 全绿 → 重新构建装载 → 重验该条目。

- [ ] **Step 4: Commit**

```bash
rtk git add docs/specs/2026-08-15-tabstage-design.md
rtk git commit -m "docs(spec): 手动验收清单通过勾选"
```
