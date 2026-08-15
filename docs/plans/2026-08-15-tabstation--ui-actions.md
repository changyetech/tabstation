# Tab Station 子计划：操作类 UI（--ui-actions）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toast 反馈件、「移动到 ▾」菜单（spec §5.3）、关闭窗口（确认 + 管理页豁免，spec §4.3）、一键去重（常驻徽标已有，本计划补 hover 预览 + 执行，spec §5.6）。

**Architecture:** 在 `--ui-list` 的组件上做增量 Modify：Toolbar 加去重按钮（hover 进出事件），TabRow 加「移动到」菜单与去重预览态，WindowSection 加 [✕ 关闭窗口]，App 加各 handler 与 `dedupePreview` 状态。

**Tech Stack:** React + Testing Library。

**Depends on:** `--ui-list`。

## Global Constraints

- 关闭窗口需轻确认（原生 `window.confirm`）；一键去重无确认（hover 预览已给预期）
- 关闭类动作走 `closeTabsWithEffect`；关闭窗口是区块级一次动效
- 文案 key 以 `--i18n` 字典为准；注释用简体中文

---

### Task 1: Toast 组件

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/manager/App.tsx`（挂载 Toast + `showToast`）、`src/manager/styles.css`
- Test: `src/components/Toast.test.tsx`

**Interfaces:**
- Produces:
  - `Toast({ message }: { message: string | null }): JSX.Element | null`
  - App 内 `const [toast, setToast] = useState<string | null>(null)` 与 `showToast(msg: string)`（2.5s 后自动清除）——`--ui-panels` 的空快照提示消费

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  it('message 为 null 时不渲染', () => {
    const { container } = render(<Toast message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('有 message 时显示', () => {
    render(<Toast message="没有可保存的 tab" />);
    expect(screen.getByText('没有可保存的 tab')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/Toast.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/components/Toast.tsx`：

```tsx
// 轻量 toast：V1 仅有的两个反馈件之一（另一个是关闭窗口 confirm，spec §4.3）
export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
```

`src/manager/App.tsx` 修改：

```tsx
// App 内新增状态与函数
const [toast, setToast] = useState<string | null>(null);
const toastTimer = useRef<number>();
const showToast = (msg: string) => {
  setToast(msg);
  window.clearTimeout(toastTimer.current);
  toastTimer.current = window.setTimeout(() => setToast(null), 2500);
};
// JSX：<I18nProvider> 内末尾挂 <Toast message={toast} />
```

`src/manager/styles.css` 追加：

```css
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #333; color: #fff; padding: 8px 16px; border-radius: 8px; z-index: 10000; }
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/components/Toast.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/Toast.tsx src/components/Toast.test.tsx src/manager/App.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 轻量 Toast"
```

---

### Task 2: 「移动到 ▾」菜单

**Files:**
- Create: `src/components/MoveMenu.tsx`
- Modify: `src/components/TabRow.tsx`（追加 props）、`src/manager/App.tsx`（构建目标 + moveTab handler）
- Test: `src/components/MoveMenu.test.tsx`

**Interfaces:**
- Produces:

```ts
export type MoveTarget =
  | { kind: 'window'; windowId: number; label: string }
  | { kind: 'new-maximized' }
  | { kind: 'new-same-size' };
// MoveMenu：hover 展开的行内菜单
interface MoveMenuProps { targets: MoveTarget[]; onPick: (t: MoveTarget) => void }
```

- `TabRowProps` 追加：`getMoveTargets?: (tab: chrome.tabs.Tab) => MoveTarget[]`、`onMove?: (tab: chrome.tabs.Tab, target: MoveTarget) => void`——两者都传且 tab 非 pinned 时渲染「移动到 ▾」按钮（pinned 隐藏移动操作，spec §4.4）
- App 的 `moveTab(tab, target)`：
  - `window` → `chrome.tabs.move(tab.id, { windowId, index: -1 })`
  - `new-maximized` → `chrome.windows.create({ tabId }) 后 chrome.windows.update(win.id, { state: 'maximized' })`
  - `new-same-size` → 读源窗口 bounds，`chrome.windows.create({ tabId, left: left+40, top: top+40, width, height })`（偏移 40 防完全重叠，spec §5.3）

- [ ] **Step 1: 写失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import MoveMenu, { type MoveTarget } from './MoveMenu';

describe('MoveMenu', () => {
  it('列出其他窗口与两种新窗口选项，点击回调', async () => {
    const onPick = vi.fn();
    const targets: MoveTarget[] = [
      { kind: 'window', windowId: 2, label: '窗口 2 · Doc (3 个 tab)' },
      { kind: 'new-maximized' },
      { kind: 'new-same-size' },
    ];
    render(
      <I18nProvider language="zh-CN">
        <MoveMenu targets={targets} onPick={onPick} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByText(/移动到/));
    await userEvent.click(screen.getByText('窗口 2 · Doc (3 个 tab)'));
    expect(onPick).toHaveBeenCalledWith(targets[0]);
    await userEvent.click(screen.getByText(/移动到/));
    await userEvent.click(screen.getByText('新窗口（全屏）'));
    expect(onPick).toHaveBeenCalledWith({ kind: 'new-maximized' });
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/MoveMenu.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`src/components/MoveMenu.tsx`：

```tsx
import { useState } from 'react';
import { useT } from '../i18n';

export type MoveTarget =
  | { kind: 'window'; windowId: number; label: string }
  | { kind: 'new-maximized' }
  | { kind: 'new-same-size' };

export default function MoveMenu({
  targets, onPick,
}: { targets: MoveTarget[]; onPick: (t: MoveTarget) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const label = (target: MoveTarget) =>
    target.kind === 'window'
      ? target.label
      : target.kind === 'new-maximized'
        ? t('move.newWindowMaximized')
        : t('move.newWindowSameSize');
  return (
    <span className="move-menu">
      <button title={t('tab.moveTo')} onClick={() => setOpen((v) => !v)}>
        {t('tab.moveTo')} ▾
      </button>
      {open && (
        <ul className="move-menu-list">
          {targets.map((target, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  setOpen(false);
                  onPick(target);
                }}
              >
                {label(target)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
```

`src/components/TabRow.tsx` 修改——props 追加并在操作区渲染（跳转与关闭按钮之间）：

```tsx
// TabRowProps 追加
getMoveTargets?: (tab: chrome.tabs.Tab) => MoveTarget[];
onMove?: (tab: chrome.tabs.Tab, target: MoveTarget) => void;

// 操作区内（pinned 隐藏移动操作，spec §4.4）
{!tab.pinned && getMoveTargets && onMove && (
  <MoveMenu targets={getMoveTargets(tab)} onPick={(target) => onMove(tab, target)} />
)}
```

`src/manager/App.tsx` 修改——新增并沿 WindowSection/DomainGroupList 传给 TabRow（这两个中转组件的 props 同步追加同名可选字段）：

```tsx
// 目标列表：其他所有窗口（标识同 §4.3）+ 两种新窗口
const getMoveTargets = (tab: chrome.tabs.Tab): MoveTarget[] => {
  const others = windows
    .filter((w) => w.id !== tab.windowId)
    .map((w) => {
      const winTabs = visible.filter((x) => x.windowId === w.id);
      const activeTitle = winTabs.find((x) => x.active)?.title ?? winTabs[0]?.title ?? '';
      return {
        kind: 'window' as const,
        windowId: w.id!,
        label: `${t('window.label', { n: numberByWindowId.get(w.id) ?? 0 })} · ${activeTitle} (${t('window.tabCount', { n: winTabs.length })})`,
      };
    });
  return [...others, { kind: 'new-maximized' }, { kind: 'new-same-size' }];
};

const moveTab = async (tab: chrome.tabs.Tab, target: MoveTarget) => {
  if (target.kind === 'window') {
    await chrome.tabs.move(tab.id!, { windowId: target.windowId, index: -1 });
  } else if (target.kind === 'new-maximized') {
    const win = await chrome.windows.create({ tabId: tab.id });
    await chrome.windows.update(win.id!, { state: 'maximized' });
  } else {
    const src = await chrome.windows.get(tab.windowId);
    await chrome.windows.create({
      tabId: tab.id,
      left: (src.left ?? 0) + 40,
      top: (src.top ?? 0) + 40,
      width: src.width,
      height: src.height,
    });
  }
};
```

注意：`getMoveTargets` 用到 `t`，因此该函数须定义在 `I18nProvider` 之内——把 App 主体拆出 `<AppInner>`（Provider 内层组件），`App` 只负责解析语言并包 Provider。此重构在本步骤一并完成。

`src/manager/styles.css` 追加：

```css
.move-menu { position: relative; }
.move-menu-list { position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #ccc; border-radius: 6px; padding: 4px; z-index: 100; min-width: 200px; list-style: none; margin: 0; }
.move-menu-list button { display: block; width: 100%; text-align: left; padding: 4px 8px; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/MoveMenu.tsx src/components/MoveMenu.test.tsx src/components/TabRow.tsx src/components/WindowSection.tsx src/components/DomainGroupList.tsx src/manager/App.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 移动到菜单（其他窗口/新窗口全屏/同尺寸）"
```

---

### Task 3: 关闭窗口（确认 + 管理页豁免 + 区块动效）

**Files:**
- Modify: `src/components/WindowSection.tsx`、`src/manager/App.tsx`
- Test: `src/components/WindowSection.test.tsx`（追加用例）

**Interfaces:**
- `WindowSectionProps` 追加：`onCloseWindow?: (win: chrome.windows.Window, sectionEl: HTMLElement | null) => void`
- WindowSection：header 右侧渲染 [✕ 关闭窗口]，点击先 `window.confirm(t('window.closeConfirm', { name: label, n: tabs.length }))`，通过才回调
- App 的 `closeWindow(win, sectionEl)`：
  - 区块级一次动效：`playCloseSound()` + `shootConfetti(分区中心)` + `animateElementOut(sectionEl)`
  - 300ms 后：窗口含管理页 → `chrome.tabs.remove(该窗口全部可见 tab id)`（保留管理页，窗口存活）；否则 `chrome.windows.remove(win.id)`

- [ ] **Step 1: 写失败测试（追加到 WindowSection.test.tsx）**

```tsx
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

describe('WindowSection 关闭窗口', () => {
  it('确认通过 → 回调；取消 → 不回调', async () => {
    const onCloseWindow = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderSection({ onCloseWindow });
    await userEvent.click(screen.getByText(/关闭窗口/));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('及其 2 个 tab'));
    expect(onCloseWindow).toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await userEvent.click(screen.getByText(/关闭窗口/));
    expect(onCloseWindow).toHaveBeenCalledTimes(1);
  });

  it('未传 onCloseWindow 时不渲染按钮', () => {
    renderSection();
    expect(screen.queryByText(/关闭窗口/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/components/WindowSection.test.tsx`
Expected: FAIL（按钮不存在）

- [ ] **Step 3: 实现**

`src/components/WindowSection.tsx` 修改：

```tsx
// props 追加 onCloseWindow?: (win, sectionEl) => void
// section 根元素加 ref：const sectionRef = useRef<HTMLElement>(null);
// header 内 h2 之后追加：
{onCloseWindow && (
  <button
    className="window-close"
    onClick={() => {
      // 轻确认（spec §4.3）：名称即分区标题
      if (!window.confirm(t('window.closeConfirm', { name: label, n: tabs.length }))) return;
      onCloseWindow(win, sectionRef.current);
    }}
  >
    ✕ {t('window.close')}
  </button>
)}
```

`src/manager/App.tsx` 修改（AppInner 内）：

```tsx
import { animateElementOut } from '../lib/effects/exit';
import { playCloseSound } from '../lib/effects/sound';
import { shootConfetti } from '../lib/effects/confetti';

// 关闭窗口：区块级一次动效；管理页所在窗口只关其他 tab、保留管理页（spec §4.3）
const closeWindow = (win: chrome.windows.Window, sectionEl: HTMLElement | null) => {
  const winVisible = visible.filter((x) => x.windowId === win.id);
  const containsManager = tabs.some(
    (x) => x.windowId === win.id && x.url?.startsWith(mUrl)
  );
  playCloseSound();
  if (sectionEl) {
    const rect = sectionEl.getBoundingClientRect();
    shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    animateElementOut(sectionEl);
  }
  window.setTimeout(() => {
    if (containsManager) {
      void chrome.tabs.remove(winVisible.map((x) => x.id!));
    } else {
      void chrome.windows.remove(win.id!);
    }
  }, 300);
};
// 每个 <WindowSection> 传 onCloseWindow={closeWindow}
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/WindowSection.tsx src/components/WindowSection.test.tsx src/manager/App.tsx
rtk git commit -m "feat(ui): 关闭窗口（确认 + 管理页豁免 + 区块动效）"
```

---

### Task 4: 一键去重（hover 预览 + 执行）

**Files:**
- Modify: `src/components/Toolbar.tsx`、`src/components/TabRow.tsx`、`src/components/WindowSection.tsx`、`src/components/DomainGroupList.tsx`、`src/manager/App.tsx`、`src/manager/styles.css`
- Test: `src/manager/App.test.tsx`（追加用例）

**Interfaces:**
- `ToolbarProps` 追加：`onDedupe: () => void`、`onDedupeHover: (hovering: boolean) => void`——按钮 `onMouseEnter/onMouseLeave/onClick`
- `TabRowProps` 追加：`dupPreview?: 'keep' | 'close'`——`keep` 加 `.dup-keep`（整行高亮），`close` 加 `.dup-doomed`（标题删除线 + 行尾 ✕ 删除符号）
- App：`dedupePreview: boolean` 状态；预览开启时按 `planDedupe(dupGroups)` 给组内行传 `dupPreview`；`runDedupe()` = `closeTabsWithEffect(closeIds → rowEls)`（无确认，spec §5.6）

- [ ] **Step 1: 写失败测试（追加到 App.test.tsx）**

```tsx
describe('一键去重', () => {
  function seedDuplicates() {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, title: 'D1', url: 'https://d.com/', lastAccessed: 100 }),
      makeTab({ id: 2, windowId: 1, index: 1, title: 'D2', url: 'https://d.com/', lastAccessed: 200 }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    return chromeMock;
  }

  it('常驻 ×2 徽标；hover 去重按钮 → 待删行出现删除线样式', async () => {
    seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('×2')).toHaveLength(2));

    await userEvent.hover(screen.getByText(/一键去重/));
    // lastAccessed 较旧的 D1 将被关闭
    expect(screen.getByText('D1').closest('li')).toHaveClass('dup-doomed');
    expect(screen.getByText('D2').closest('li')).toHaveClass('dup-keep');

    await userEvent.unhover(screen.getByText(/一键去重/));
    expect(screen.getByText('D1').closest('li')).not.toHaveClass('dup-doomed');
  });

  it('点击一键去重 → 关闭待删 tab（保留最近浏览）', async () => {
    const chromeMock = seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getByText('D1')).toBeInTheDocument());
    await userEvent.click(screen.getByText(/一键去重/));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: FAIL（按钮不存在）

- [ ] **Step 3: 实现**

`src/components/Toolbar.tsx` 修改——props 追加 `onDedupe: () => void; onDedupeHover: (h: boolean) => void`，视图切换组之后插入：

```tsx
<button
  onMouseEnter={() => onDedupeHover(true)}
  onMouseLeave={() => onDedupeHover(false)}
  onClick={onDedupe}
>
  {t('toolbar.dedupe')}
</button>
```

`src/components/TabRow.tsx` 修改——props 追加 `dupPreview?: 'keep' | 'close'`：

```tsx
// li 的 className 拼接
const previewClass =
  dupPreview === 'close' ? ' dup-doomed' : dupPreview === 'keep' ? ' dup-keep' : '';
// <li className={`tab-row${previewClass}`} ...>
// 待删行行尾（actions 之前）追加删除符号：
{dupPreview === 'close' && <span className="doom-mark">✕</span>}
```

`src/manager/App.tsx`（AppInner）修改：

```tsx
const [dedupePreview, setDedupePreview] = useState(false);
const dedupePlan = useMemo(() => planDedupe(dupGroups), [dupGroups]);
// 预览态查表：tabId → 'keep' | 'close'（仅预览开启时传给行）
const previewByTabId = useMemo(() => {
  const m = new Map<number, 'keep' | 'close'>();
  if (!dedupePreview) return m;
  dedupePlan.closeIds.forEach((id) => m.set(id, 'close'));
  dedupePlan.keepIds.forEach((id) => m.set(id, 'keep'));
  return m;
}, [dedupePreview, dedupePlan]);

// 一键去重：无确认（hover 预览已给预期，spec §5.6）
const runDedupe = () => {
  setDedupePreview(false);
  void closeTabsWithEffect(
    dedupePlan.closeIds.map((id) => ({ tabId: id, el: rowEls.current.get(id) ?? null }))
  );
};
// Toolbar 传 onDedupe={runDedupe} onDedupeHover={setDedupePreview}
// TabRow 传 dupPreview={previewByTabId.get(tab.id!)}（经 WindowSection/DomainGroupList 透传，
// 两个中转组件 props 各追加 previewByTabId: Map<number, 'keep' | 'close'>）
```

`src/manager/styles.css` 追加：

```css
.dup-keep { background: #fff7ec; }
.dup-doomed { background: #fdeeee; }
.dup-doomed .title { text-decoration: line-through; color: #999; }
.doom-mark { color: #b35a5a; font-weight: 700; }
```

- [ ] **Step 4: 运行确认通过（全量）**

Run: `pnpm vitest run`
Expected: PASS

- [ ] **Step 5: 手动冒烟**

`pnpm build` 重载扩展：开两个相同 URL 的 tab（其中一个加 `#hash`），确认常驻 ×2 徽标、hover 预览删除线、点击后保留最近浏览的且有动效。

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/Toolbar.tsx src/components/TabRow.tsx src/components/WindowSection.tsx src/components/DomainGroupList.tsx src/manager/App.tsx src/manager/App.test.tsx src/manager/styles.css
rtk git commit -m "feat(ui): 一键去重（常驻徽标 + hover 预览 + 无确认执行）"
```
