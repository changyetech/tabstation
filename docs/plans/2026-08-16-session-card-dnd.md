# 会话卡片条目行对齐 by windows + 跨会话拖拽 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 已保存会话卡片的条目行样式/交互完全对齐 by windows 标签行，并支持跨会话拖拽移动条目（源拖空自动删会话）。

**Architecture:** `DndContext` 从每张 `SessionBlock` 提升到 `SessionSection` 顶层（与 by windows 在 App 层的结构同构），行组件 `SessionTabRow` 重写 markup 对齐 `TabRow` 的 class 结构复用现有 CSS；数据层以纯函数 `moveSessionTab` 承载同/跨会话移动，落点映射以纯函数 `sessionDragEndToMove` 承载（可测）。

**Tech Stack:** React + TypeScript、@dnd-kit/core + @dnd-kit/sortable、Vitest + Testing Library、chrome.storage.local。

**Spec:** [docs/specs/2026-08-16-session-card-dnd.md](../specs/2026-08-16-session-card-dnd.md)

## Global Constraints

- 代码注释用简体中文；沿用现有代码风格与命名。
- 所有终端命令加 `rtk` 前缀（含 `&&` 链中的每一段）。
- TDD：每个任务先写失败测试再实现；提交前测试必须全绿。
- 不新增 CSS：session 行复用 `tab-row`/`tab-line`/`drag-grip`/`tab-title`/`tab-host`/`row-spacer`/`row-acts`/`tab-pin` 既有类。
- 不做非目标：不与实时窗口互拖、不做整卡排序、不做复制/多选（spec §6）。

---

### Task 1: storage.ts 纯函数 `moveSessionTab`

**Files:**
- Modify: `src/lib/storage.ts`（在 `reorderSessionTab` 后新增；`reorderSessionTab` 暂保留，Task 4 删除）
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: 既有类型 `SavedSession`、测试工厂 `session(over)`（storage.test.ts 顶部已有）。
- Produces: `moveSessionTab(sessions: SavedSession[], fromSessionId: string, fromIndex: number, toSessionId: string, toIndex: number): SavedSession[]` —— Task 2/4 依赖此签名。

- [ ] **Step 1: 写失败测试**

在 `src/lib/storage.test.ts` 的 `describe('会话条目操作')` 内追加（import 处加入 `moveSessionTab`）：

```ts
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `rtk vitest run src/lib/storage.test.ts`
Expected: FAIL（`moveSessionTab` 未导出）

- [ ] **Step 3: 最小实现**

在 `src/lib/storage.ts` 的 `reorderSessionTab` 之后新增：

```ts
// 同/跨会话移动条目（spec 2026-08-16-session-card-dnd §3.3）：
// 跨会话为「源删除 + 目标落点插入」；源拖空则会话消亡（与删空规则一致）；
// id 不存在或下标越界（陈旧拖拽状态）原样返回
export function moveSessionTab(
  sessions: SavedSession[],
  fromSessionId: string,
  fromIndex: number,
  toSessionId: string,
  toIndex: number,
): SavedSession[] {
  const from = sessions.find((s) => s.id === fromSessionId);
  const to = sessions.find((s) => s.id === toSessionId);
  if (!from || !to) return sessions;
  if (fromIndex < 0 || fromIndex >= from.tabs.length) return sessions;
  // 同会话落点上限 len-1（移动），跨会话允许 len（尾部追加）
  const maxTo = fromSessionId === toSessionId ? to.tabs.length - 1 : to.tabs.length;
  if (toIndex < 0 || toIndex > maxTo) return sessions;
  if (fromSessionId === toSessionId) {
    if (fromIndex === toIndex) return sessions;
    const tabs = [...from.tabs];
    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    return sessions.map((s) => (s.id === fromSessionId ? { ...s, tabs } : s));
  }
  const moved = from.tabs[fromIndex];
  const fromTabs = from.tabs.filter((_, i) => i !== fromIndex);
  const toTabs = [...to.tabs];
  toTabs.splice(toIndex, 0, moved);
  return sessions.flatMap((s) => {
    if (s.id === fromSessionId) return fromTabs.length === 0 ? [] : [{ ...s, tabs: fromTabs }];
    if (s.id === toSessionId) return [{ ...s, tabs: toTabs }];
    return [s];
  });
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `rtk vitest run src/lib/storage.test.ts`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交**

```bash
rtk git add src/lib/storage.ts src/lib/storage.test.ts && rtk git commit -m "feat(storage): moveSessionTab 支持同/跨会话移动条目"
```

---

### Task 2: dnd.ts 落点映射 `sessionDragEndToMove`

**Files:**
- Modify: `src/lib/dnd.ts`
- Test: `src/lib/dnd.test.ts`

**Interfaces:**
- Produces: `interface SessionDragData { sessionId: string; index: number }`；`sessionDragEndToMove(active: SessionDragData, over: SessionDragData | null): { fromSessionId: string; fromIndex: number; toSessionId: string; toIndex: number } | null` —— Task 3 的 `onDragEnd` 依赖。

- [ ] **Step 1: 写失败测试**

在 `src/lib/dnd.test.ts` 追加（import 处加入 `sessionDragEndToMove`）：

```ts
describe('sessionDragEndToMove', () => {
  it('跨会话落点 → 四参映射', () => {
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 2 }, { sessionId: 's2', index: 0 }),
    ).toEqual({ fromSessionId: 's1', fromIndex: 2, toSessionId: 's2', toIndex: 0 });
  });
  it('同会话不同下标 → 四参映射', () => {
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 0 }, { sessionId: 's1', index: 3 }),
    ).toEqual({ fromSessionId: 's1', fromIndex: 0, toSessionId: 's1', toIndex: 3 });
  });
  it('无落点或原位 → null', () => {
    expect(sessionDragEndToMove({ sessionId: 's1', index: 0 }, null)).toBeNull();
    expect(
      sessionDragEndToMove({ sessionId: 's1', index: 1 }, { sessionId: 's1', index: 1 }),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `rtk vitest run src/lib/dnd.test.ts`
Expected: FAIL（`sessionDragEndToMove` 未导出）

- [ ] **Step 3: 最小实现**

在 `src/lib/dnd.ts` 末尾新增：

```ts
// 会话卡片拖拽落点 → moveSessionTab 参数（spec 2026-08-16-session-card-dnd §3.2）
// 无落点或原位返回 null（不写 storage）
export interface SessionDragData {
  sessionId: string;
  index: number;
}

export function sessionDragEndToMove(
  active: SessionDragData,
  over: SessionDragData | null,
): { fromSessionId: string; fromIndex: number; toSessionId: string; toIndex: number } | null {
  if (!over) return null;
  if (over.sessionId === active.sessionId && over.index === active.index) return null;
  return {
    fromSessionId: active.sessionId,
    fromIndex: active.index,
    toSessionId: over.sessionId,
    toIndex: over.index,
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `rtk vitest run src/lib/dnd.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
rtk git add src/lib/dnd.ts src/lib/dnd.test.ts && rtk git commit -m "feat(dnd): 会话拖拽落点映射 sessionDragEndToMove"
```

---

### Task 3: SessionSection 重构（行对齐 + DndContext 提升 + onMoveTab）

**Files:**
- Modify: `src/components/SessionSection.tsx`
- Test: `src/components/SessionSection.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `sessionDragEndToMove` / `SessionDragData`；既有 `GripIcon`、`Icon`（`./icons`）、`Favicon`、`hostnameOf`（`../lib/grouping`）、`foldTabs`。
- Produces: `SessionSectionProps` 中 `onReorderTab` 替换为 `onMoveTab: (fromSessionId: string, fromIndex: number, toSessionId: string, toIndex: number) => void` —— Task 4 的 App 接线依赖。

- [ ] **Step 1: 改写测试（先失败）**

`src/components/SessionSection.test.tsx` 改动：

1. `renderSection` 的 props 中 `onReorderTab: vi.fn()` 改为 `onMoveTab: vi.fn()`。
2. 「条目操作」用例中 `screen.getAllByTitle('单独打开')` 改为 `screen.getAllByTitle(/单独打开/)`（整行 title 变为 `标题 · 单独打开`）。
3. 追加以下用例：

```tsx
describe('SessionSection 条目行对齐 by windows（spec 2026-08-16-session-card-dnd §2）', () => {
  it('行为 tab-row 结构：grip 把手、域名列，无时间列、无 URL 子标题', () => {
    const { view } = renderSection();
    const row = view.container.querySelector('.session-block .tab-row');
    expect(row).toBeInTheDocument();
    expect(row!.querySelector('.drag-grip')).toBeInTheDocument();
    expect(row!.querySelector('.tab-host')!.textContent).toBe('a.com');
    expect(row!.querySelector('.tab-time')).not.toBeInTheDocument();
    expect(view.container.querySelector('.rl-url')).not.toBeInTheDocument();
    expect(view.container.querySelector('.session-tab-row')).not.toBeInTheDocument();
  });

  it('pinned 行：图钉图标 + ghost 态 grip', () => {
    const pinned: SavedSession[] = [
      {
        id: 's3',
        name: 'P',
        createdAt: 1,
        tabs: [{ url: 'https://a.com/', title: 'A', pinned: true }],
      },
    ];
    const { view } = renderSection({ sessions: pinned });
    expect(view.container.querySelector('.tab-pin')).toBeInTheDocument();
    expect(view.container.querySelector('.drag-grip.ghost')).toBeInTheDocument();
  });

  it('整行点击 → onOpenTab；行内按钮不触发整行打开', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getAllByTitle(/单独打开/)[0]);
    expect(props.onOpenTab).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByTitle('新窗口打开')[0]);
    expect(props.onOpenTabNewWindow).toHaveBeenCalledWith(sessions[0].tabs[0]);
    expect(props.onOpenTab).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `rtk vitest run src/components/SessionSection.test.tsx`
Expected: FAIL（props 类型不符 / `.tab-row` 不存在）

- [ ] **Step 3: 实现重构**

`src/components/SessionSection.tsx` 整体改动（关键代码如下）：

1. **props 接口**：

```ts
export interface SessionSectionProps {
  sessions: SavedSession[];
  visibleLimit: Settings['visibleTabs'];
  expandedKeys: ReadonlySet<string>;
  onToggleExpand: (key: string) => void;
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onMoveTab: (fromSessionId: string, fromIndex: number, toSessionId: string, toIndex: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
  onOpenTabNewWindow: (tab: SessionTab) => void;
}
```

2. **SessionTabRow 重写**（对齐 TabRow 的 class 结构，spec §2；import 处补 `GripIcon`、`hostnameOf`）：

```tsx
// 会话条目行：markup 对齐 TabRow（tab-row/tab-line），复用既有 CSS；
// 整行可点 = 当前窗口打开（模板式，条目保留）；pinned 不可拖（对齐 by windows）
function SessionTabRow({
  sessionId,
  tab,
  index,
  onDelete,
  onOpen,
  onOpenNewWindow,
}: {
  sessionId: string;
  tab: SessionTab;
  index: number;
  onDelete: () => void;
  onOpen: () => void;
  onOpenNewWindow: () => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `${sessionId}:${index}`,
    disabled: Boolean(tab.pinned),
    data: { sessionId, index },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="tab-row"
      {...attributes}
      {...listeners}
    >
      <div
        className="tab-line"
        role="button"
        tabIndex={0}
        title={`${tab.title} · ${t('sessions.openTab')}`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          e.preventDefault();
          onOpen();
        }}
      >
        <span className={`drag-grip${tab.pinned ? ' ghost' : ''}`} title={t('tab.drag')}>
          <GripIcon />
        </span>
        <Favicon url={tab.url} favIconUrl={tab.favIconUrl} />
        {tab.pinned && (
          <span className="tab-pin" title={t('tab.pinned')}>
            <Icon name="pin" size={12} />
          </span>
        )}
        <span className="tab-title">{tab.title}</span>
        <span className="tab-host">{hostnameOf(tab.url)}</span>
        <span className="row-spacer" />
        <span className="row-acts">
          <button
            className="icon-btn"
            title={t('sessions.tabNewWindow')}
            onClick={(e) => {
              e.stopPropagation();
              onOpenNewWindow();
            }}
          >
            <Icon name="winNew" size={13} />
          </button>
          <button
            className="icon-btn danger"
            title={t('sessions.removeTab')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </span>
      </div>
    </li>
  );
}
```

3. **SessionBlock 收缩**：删除其内部 `useSensors`、`DndContext`、`handleDragEnd`（`SortableContext` 保留）；props 类型改为 `{ session: SavedSession } & Omit<SessionSectionProps, 'sessions' | 'onMoveTab'>`（`onMoveTab` 由顶层 `handleDragEnd` 消费，不再下传）。
4. **DndContext 提升到 SessionSection**（spec §3.2；import 处补 `sessionDragEndToMove` 与 `type SessionDragData`（`../lib/dnd`）；dnd-kit 的 `DndContext/PointerSensor/useSensor/useSensors/DragEndEvent` 本文件已有，只是使用位置上移）：

```tsx
// 已保存会话：一个 DndContext 包住全部卡片（与 by windows 的 App 层结构同构）→ 跨会话拖拽成立
export default function SessionSection({ sessions, onMoveTab, ...rest }: SessionSectionProps) {
  const t = useT();
  // 整行是拖拽把手，需位移阈值，否则行内按钮的 pointerdown 会被判成起拖（同 App.tsx）
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    // data.current 的类型是 dnd-kit 定死的 Record<string, any>，属库边界；
    // 这里的具体形状由 SessionTabRow 的 useSortable({ data }) 保证
    const move = sessionDragEndToMove(
      e.active.data.current as SessionDragData,
      (e.over?.data.current as SessionDragData | undefined) ?? null,
    );
    if (move) onMoveTab(move.fromSessionId, move.fromIndex, move.toSessionId, move.toIndex);
  };

  if (sessions.length === 0) {
    return (
      <div className="empty-all">
        <span className="icon">
          <Icon name="save" size={16} />
        </span>
        <br />
        {t('sessions.empty')}
      </div>
    );
  }
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="win-flow">
        {sessions.map((s) => (
          <SessionBlock key={s.id} session={s} {...rest} />
        ))}
      </div>
    </DndContext>
  );
}
```

注意：`useSensors` 是 hook，必须在空态早退 return **之前**调用（如上）。

- [ ] **Step 4: 跑测试确认通过**

Run: `rtk vitest run src/components/SessionSection.test.tsx`
Expected: PASS（含既有用例：恢复/删除/重命名/折叠/空态）

- [ ] **Step 5: 提交**

```bash
rtk git add src/components/SessionSection.tsx src/components/SessionSection.test.tsx && rtk git commit -m "feat(sessions): 条目行对齐 by windows，DndContext 提升支持跨会话拖拽"
```

---

### Task 4: App 接线切换 + 旧代码/孤儿 CSS 清理

**Files:**
- Modify: `src/manager/App.tsx:293-294`（handler）、`src/manager/App.tsx:476`（prop）、`src/manager/App.tsx:31`（import）
- Modify: `src/lib/storage.ts`（删除 `reorderSessionTab`）
- Modify: `src/lib/storage.test.ts`（删除 `reorderSessionTab` 三个用例与 import）
- Modify: `src/manager/styles.css`（删除本次改动孤儿化的 `.session-tab-row` / `.session-tab-title` / `.st-acts` 相关选择器）

**Interfaces:**
- Consumes: Task 1 的 `moveSessionTab`、Task 3 的 `onMoveTab` prop 签名。
- Produces: 无新接口（收尾任务）。

- [ ] **Step 1: App.tsx 接线**

```ts
// import 处：reorderSessionTab → moveSessionTab
const handleMoveTab = (
  fromSessionId: string,
  fromIndex: number,
  toSessionId: string,
  toIndex: number,
) => void setSessions(moveSessionTab(sessions, fromSessionId, fromIndex, toSessionId, toIndex));
```

`SessionSection` 处 `onReorderTab={handleReorderTab}` 改为 `onMoveTab={handleMoveTab}`。

- [ ] **Step 2: 删除 `reorderSessionTab`**

- `src/lib/storage.ts`：删除 `reorderSessionTab` 函数（已被 `moveSessionTab` 取代且无引用）。
- `src/lib/storage.test.ts`：删除 import 中的 `reorderSessionTab` 与「reorderSessionTab 移动条目 / from 越界 / to 越界」三个用例（语义已由 `moveSessionTab` 用例覆盖）。

- [ ] **Step 3: 清理孤儿 CSS**

`src/manager/styles.css` 中仅删除本次孤儿化的选择器（`rl-*` 是稍后阅读侧栏的，保留）：

- `.session-tab-row:hover .st-acts, .st-acts:focus-within,`（约 224–225 行，actsIn 动画选择器组内的两行）
- `.st-acts`（约 736–742 行选择器组中的 `,\n.st-acts` 部分）
- `.session-tab-row:hover .st-acts, .st-acts:focus-within`（约 745–748 行选择器组中的两行）
- `.st-acts .icon-btn` / `.st-acts .icon-btn:hover` / `.st-acts .icon-btn.danger:hover`（约 755–770 行选择器组中的 `.st-acts` 部分）
- `.session-tab-row { … }`、`.session-tab-row:hover { … }`、`.session-tab-title { … }`、`.session-tab-title:hover { … }` 整块（约 791–815 行）

删完后确认无残留：

Run: `rtk grep -rn "session-tab\|st-acts" src`
Expected: 0 matches

- [ ] **Step 4: 全量验证**

Run: `rtk vitest run`
Expected: 全部 PASS

Run: `rtk npm run build`
Expected: tsc --noEmit 无错误，vite build 成功

- [ ] **Step 5: 提交**

```bash
rtk git add src/manager/App.tsx src/lib/storage.ts src/lib/storage.test.ts src/manager/styles.css && rtk git commit -m "feat(sessions): App 接线 moveSessionTab，清理旧行样式孤儿 CSS"
```

---

## 验收对照（spec §2/§3/§4/§5）

- 行样式对齐、整行可点、pinned 不可拖 → Task 3 测试。
- 跨会话移动、拖空删会话、越界防御 → Task 1 测试。
- 落点映射（跨卡/同卡/原位）→ Task 2 测试。
- 折叠前缀下标即原下标 → 无需额外代码（`foldTabs` 既有行为），Task 3 既有折叠用例回归。
- 手动冒烟（可选）：`rtk npm run dev` watch 构建后按 docs/local-debugging.md 加载扩展，验证跨卡拖拽动画与落盘。
