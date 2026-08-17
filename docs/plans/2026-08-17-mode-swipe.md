# 模式横滑切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理页的三个模式（窗口 / 全部 / 已保存会话）除点击控制条分段按钮外，支持触控板双指横滑循环切换，并把切换过场从纵向淡入改为带方向的横向滑入。

**Architecture:** 三层。纯逻辑层新增两个模块：`src/lib/mode.ts`（模式顺序、循环 `cycleMode`、线性 `directionBetween`）与 `src/lib/swipe.ts`（wheel 事件流的「累积触发 + 静止解锁」状态机，不读时钟、不碰 DOM）。桥接层新增 `src/hooks/useHorizontalSwipe.ts`，在 `window` 上挂 non-passive `wheel` 监听，把 `(deltaX, deltaY, performance.now())` 喂给状态机。视图层在 `App.tsx` 把手势与点击收敛到同一个 `switchMode`，并用新增的 `dir` state 给 `<main>` 打上 `dir-next` / `dir-prev`，CSS 据此选方向性 keyframes。

**Tech Stack:** React 18 + TypeScript (strict) + Vitest / jsdom / Testing Library，包管理 pnpm。

**Spec:** [docs/specs/2026-08-17-mode-swipe.md](../specs/2026-08-17-mode-swipe.md)（本计划全部条款的来源；下文以 §N 引用）

## Global Constraints

- 范围仅管理页（`src/manager/`、`src/components/`、`src/hooks/`、`src/lib/`）；设置页不涉及。
- 手势参数写死在 `src/lib/swipe.ts`，不做用户可配置项：`ratio = 1.2`、`threshold = 80`（px）、静止解锁 `restMs = 260`（ms）、累积超时 `resetMs = 400`（ms）。
- 过场时长与曲线沿用现状：`0.18s cubic-bezier(0.2, 0, 0, 1)`。横向位移 `24px`。
- `src/lib/` 是纯函数层：不引 React、不碰 DOM、不读时钟（时间由调用方传入），**不得反向依赖 `src/components/`**。
- 注释一律简体中文。测试文件与被测文件同目录同名 `.test.ts` / `.test.tsx`。
- 现有对外 API 不得破坏：`import Toolbar, { type Mode } from '../components/Toolbar'` 这条路径必须继续可用。
- 输入方式仅触控板 wheel 的 `deltaX`；不做键盘、不做触摸屏 swipe、不做鼠标拖拽画布（§10 非目标）。
- 每个任务结尾必须 `make check` 通过（fmt-check + lint + typecheck + test）后再提交。

---

## 前置阅读（实现者背景）

这是一个 Chrome MV3 扩展的管理页（React SPA）。你需要知道的三件事：

1. **没有 dev server**。逻辑验证全部走 Vitest（`pnpm vitest run <file>`），不要试图起浏览器。
2. **`chrome.*` 在测试里是 mock 的**，`src/test/setup.ts` 已全局安装并每例重置；本计划不涉及任何 `chrome.*` 新调用。
3. **`src/manager/App.test.tsx` 的断言是中文文案**（`navigator.language` 在 setup 里被钉死为 `zh-CN`）。三个模式按钮的文案分别是 `窗口模式` / `全部模式` / `已保存会话`。

单文件测试命令：`pnpm vitest run src/lib/mode.test.ts`
全量校验：`make check`

## File Structure

| 文件 | 状态 | 职责 |
| --- | --- | --- |
| `src/lib/mode.ts` | 新建 | `Mode` / `Direction` 类型、`MODES` 顺序、`cycleMode`（循环）、`directionBetween`（线性） |
| `src/lib/mode.test.ts` | 新建 | 上述纯函数的单测 |
| `src/lib/swipe.ts` | 新建 | `isHorizontal` + `createSwipeDetector` 手势状态机（纯函数，无时钟） |
| `src/lib/swipe.test.ts` | 新建 | 固定时间戳序列驱动的状态机单测 |
| `src/hooks/useHorizontalSwipe.ts` | 新建 | `window` wheel/pointer 监听 → 状态机 → 回调 |
| `src/hooks/useHorizontalSwipe.test.ts` | 新建 | jsdom 派发事件的桥接层单测 |
| `src/components/Toolbar.tsx` | 修改 | `Mode` 类型从本文件迁出到 `lib/mode.ts`，改为再导出 |
| `src/manager/App.tsx` | 修改 | 新增 `dir` state 与 `switchMode`，接手势 hook，`<main>` 加方向 class |
| `src/manager/App.test.tsx` | 修改 | 增补 4 个手势用例 |
| `src/manager/styles.css` | 修改 | `viewIn` 拆成 `viewInNext` / `viewInPrev`；`html` 加 `overscroll-behavior-x: none` 兜底 |

任务顺序即依赖顺序：Task 2 依赖 Task 1 的 `Direction` 类型，Task 3 依赖 Task 1、2，Task 4 依赖全部。

## 对 spec 的两处澄清（实现按本节，不按 spec 字面）

1. **`directionBetween(m, m)` 取 `'next'`**。spec §6 正文写「否则 `'prev'`」但括号里写「相同视作 `'next'`」，二者矛盾；§9.1 又要求为「相同」写用例。按括号取 `'next'`（用 `>=` 比较）。该取值不影响渲染——同模式点击不改 `key`，`<main>` 不重挂载，动画不重放。
2. **detector 建在 `useEffect` 体内的局部 const，而不是 `useRef`**。spec §5 提的约束实质是「依赖数组为空 + 状态跨渲染持久」；空依赖的效果只跑一次，闭包里的 const 天然满足，比 ref 少一层间接。`onSwipe` 回调仍必须走 ref（否则闭包里的 `mode` 会陈旧）。

---

### Task 1: 模式常量与循环（`lib/mode.ts`）

**Files:**
- Create: `src/lib/mode.ts`
- Create: `src/lib/mode.test.ts`
- Modify: `src/components/Toolbar.tsx:1-4`（`Mode` 类型迁出并再导出）

**Interfaces:**
- Consumes: 无。
- Produces:
  - `type Mode = 'window' | 'all' | 'sessions'`
  - `type Direction = 'prev' | 'next'`
  - `const MODES: readonly Mode[]`
  - `cycleMode(mode: Mode, dir: Direction): Mode`
  - `directionBetween(from: Mode, to: Mode): Direction`
  - `Toolbar.tsx` 继续再导出 `Mode`，`import Toolbar, { type Mode } from '../components/Toolbar'` 不变。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/mode.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { MODES, cycleMode, directionBetween } from './mode';

describe('MODES', () => {
  it('顺序与控制条分段按钮从左到右一致', () => {
    expect(MODES).toEqual(['window', 'all', 'sessions']);
  });
});

describe('cycleMode', () => {
  it('next 正向遍历三模式', () => {
    expect(cycleMode('window', 'next')).toBe('all');
    expect(cycleMode('all', 'next')).toBe('sessions');
  });
  it('next 到尾回绕到首', () => {
    expect(cycleMode('sessions', 'next')).toBe('window');
  });
  it('prev 反向遍历三模式', () => {
    expect(cycleMode('sessions', 'prev')).toBe('all');
    expect(cycleMode('all', 'prev')).toBe('window');
  });
  it('prev 到首回绕到尾', () => {
    expect(cycleMode('window', 'prev')).toBe('sessions');
  });
});

describe('directionBetween', () => {
  it('相邻：向右为 next，向左为 prev', () => {
    expect(directionBetween('window', 'all')).toBe('next');
    expect(directionBetween('all', 'window')).toBe('prev');
  });
  it('跨两格按线性比较，不取模', () => {
    expect(directionBetween('window', 'sessions')).toBe('next');
    expect(directionBetween('sessions', 'window')).toBe('prev');
  });
  it('相同视作 next（无位移，方向不参与渲染）', () => {
    expect(directionBetween('all', 'all')).toBe('next');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/lib/mode.test.ts`
Expected: FAIL —— `Failed to resolve import "./mode"`

- [ ] **Step 3: 写最小实现**

创建 `src/lib/mode.ts`：

```ts
// 主区模式的顺序与方向语义（spec 2026-08-17-mode-swipe §6）
export type Mode = 'window' | 'all' | 'sessions';
export type Direction = 'prev' | 'next';

// 顺序与控制条分段按钮从左到右一致
export const MODES: readonly Mode[] = ['window', 'all', 'sessions'];

// 手势切换：下标 ±1 取模，首尾循环（三元环直径为 1，任意模式一次手势直达）
export function cycleMode(mode: Mode, dir: Direction): Mode {
  const i = MODES.indexOf(mode);
  const step = dir === 'next' ? 1 : -1;
  return MODES[(i + step + MODES.length) % MODES.length];
}

// 点击切换：按下标线性比较，不取模——分段按钮在空间上画的是一条直线，
// 点右边的格子就该从右侧滑入。相同视作 next（无位移，不重挂载）
export function directionBetween(from: Mode, to: Mode): Direction {
  return MODES.indexOf(to) >= MODES.indexOf(from) ? 'next' : 'prev';
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/lib/mode.test.ts`
Expected: PASS（12 个断言，3 个 describe）

- [ ] **Step 5: `Mode` 类型迁出 Toolbar**

修改 `src/components/Toolbar.tsx` 顶部——把第 4 行的 `export type Mode = ...` 换成从 `lib/mode` 引入再导出。改完后文件前 6 行应为：

```tsx
import { useT } from '../i18n';
import { Icon } from './icons';
import type { Mode } from '../lib/mode';

// 类型属领域逻辑，定义在 lib/mode.ts；此处再导出以保持既有 import 路径
export type { Mode };
```

文件其余部分（`ToolbarProps` 起）一行不动。

- [ ] **Step 6: 跑类型检查与相关测试**

Run: `pnpm exec tsc --noEmit && pnpm vitest run src/components/Toolbar.test.tsx src/manager/App.test.tsx`
Expected: PASS，无类型错误（`App.tsx` 的 `import Toolbar, { type Mode }` 仍然解析得到）

- [ ] **Step 7: 全量校验并提交**

Run: `make check`
Expected: 全绿

```bash
rtk git add src/lib/mode.ts src/lib/mode.test.ts src/components/Toolbar.tsx
rtk git commit -m "feat(mode): 抽出模式顺序与方向语义到 lib/mode"
```

---

### Task 2: 手势判定状态机（`lib/swipe.ts`）

触控板的 wheel 是连续事件流且带惯性尾巴：一次挥动可打出数十个事件、惯性再延续数百毫秒。天真的「单事件超阈值即切换」会一次手势连切多次。所以是**累积触发 + 静止解锁**：累积同方向位移到阈值触发一次，触发后加锁，直到连续无横向事件达 `restMs` 才解锁。解锁不用定时器——锁定态每来一个事件就刷新时间戳，下次 `feed` 时比对间隔。整个模块因此无副作用，可用固定时间戳序列测试。

**Files:**
- Create: `src/lib/swipe.ts`
- Create: `src/lib/swipe.test.ts`

**Interfaces:**
- Consumes: `type Direction` from `src/lib/mode.ts`（Task 1）
- Produces:
  - `isHorizontal(dx: number, dy: number, ratio?: number): boolean`
  - `interface SwipeDetector { feed(dx: number, dy: number, now: number): Direction | null }`
  - `createSwipeDetector(opts?: SwipeOptions): SwipeDetector`

- [ ] **Step 1: 写失败测试**

创建 `src/lib/swipe.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { createSwipeDetector, isHorizontal } from './swipe';

describe('isHorizontal', () => {
  it('|dx| 超过 |dy| * ratio 才算横向', () => {
    expect(isHorizontal(10, 8)).toBe(true); // 10 > 9.6
    expect(isHorizontal(10, 9)).toBe(false); // 10 > 10.8 不成立
  });
  it('纯纵向与零位移都不算横向', () => {
    expect(isHorizontal(0, 20)).toBe(false);
    expect(isHorizontal(0, 0)).toBe(false);
  });
  it('ratio 可覆盖', () => {
    expect(isHorizontal(10, 9, 1)).toBe(true);
  });
});

describe('createSwipeDetector', () => {
  it('单次大位移即触发，符号决定方向', () => {
    expect(createSwipeDetector().feed(100, 0, 1000)).toBe('next');
    expect(createSwipeDetector().feed(-100, 0, 1000)).toBe('prev');
  });

  it('多次小位移累积到阈值才触发', () => {
    const d = createSwipeDetector();
    expect(d.feed(30, 0, 1000)).toBe(null);
    expect(d.feed(30, 0, 1050)).toBe(null);
    expect(d.feed(30, 0, 1100)).toBe('next'); // 累积 90 ≥ 80
  });

  it('触发后紧跟的惯性事件流不再触发', () => {
    const d = createSwipeDetector();
    expect(d.feed(100, 0, 1000)).toBe('next');
    expect(d.feed(90, 0, 1050)).toBe(null);
    expect(d.feed(80, 0, 1100)).toBe(null);
    expect(d.feed(60, 0, 1200)).toBe(null);
  });

  it('横向静止达解锁时长后可再次触发', () => {
    const d = createSwipeDetector();
    expect(d.feed(100, 0, 1000)).toBe('next');
    expect(d.feed(100, 0, 1100)).toBe(null); // 仍在锁定态
    expect(d.feed(100, 0, 1400)).toBe('next'); // 距上次横向事件 300ms ≥ 260ms
  });

  it('纵向与斜向不进累积，也不触发', () => {
    const d = createSwipeDetector();
    expect(d.feed(10, 100, 1000)).toBe(null);
    expect(d.feed(100, 100, 1050)).toBe(null); // 100 > 120 不成立
    expect(d.feed(100, 100, 1100)).toBe(null); // 前两次未计入累积
  });

  it('方向反转清零累积，从新方向重新计数', () => {
    const d = createSwipeDetector();
    expect(d.feed(70, 0, 1000)).toBe(null);
    expect(d.feed(-20, 0, 1050)).toBe(null); // 反转 → 累积重置为 -20（非 50）
    expect(d.feed(-60, 0, 1100)).toBe('prev'); // -80 达阈值
  });

  it('累积超时清零，极慢速推动不误触', () => {
    const d = createSwipeDetector();
    expect(d.feed(60, 0, 1000)).toBe(null);
    expect(d.feed(60, 0, 1500)).toBe(null); // 间隔 500ms > 400ms → 清零后只有 60
    expect(d.feed(60, 0, 1550)).toBe('next'); // 120 达阈值
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/lib/swipe.test.ts`
Expected: FAIL —— `Failed to resolve import "./swipe"`

- [ ] **Step 3: 写最小实现**

创建 `src/lib/swipe.ts`：

```ts
import type { Direction } from './mode';

export interface SwipeOptions {
  /** 横向判定：|dx| > |dy| * ratio */
  ratio?: number;
  /** 同方向累积触发阈值（px） */
  threshold?: number;
  /** 触发后需连续无横向事件多久才解锁（ms） */
  restMs?: number;
  /** 距上次计入事件超过该时长则累积清零（ms） */
  resetMs?: number;
}

export interface SwipeDetector {
  /** 喂一个横向/纵向位移；命中返回方向，否则 null */
  feed(dx: number, dy: number, now: number): Direction | null;
}

export function isHorizontal(dx: number, dy: number, ratio = 1.2): boolean {
  return Math.abs(dx) > Math.abs(dy) * ratio;
}

// 累积触发 + 静止解锁（spec 2026-08-17-mode-swipe §4）：
// 触控板一次挥动会打出数十个 wheel 事件、惯性再延续数百毫秒，
// 单事件超阈值即切换会连切多次。解锁不用定时器，靠事件间隔判定，保持无副作用。
export function createSwipeDetector(opts: SwipeOptions = {}): SwipeDetector {
  const { ratio = 1.2, threshold = 80, restMs = 260, resetMs = 400 } = opts;
  let acc = 0; // 带符号的同方向累积位移
  let lastAt = 0; // 上一次横向事件的时间戳
  let locked = false;

  return {
    feed(dx, dy, now) {
      if (!isHorizontal(dx, dy, ratio)) return null;
      const idle = now - lastAt;
      lastAt = now;

      if (locked) {
        // 惯性尾巴期间不断刷新时间戳；连续静止达 restMs 才解锁，并把本次计入新一轮
        if (idle < restMs) return null;
        locked = false;
        acc = 0;
      } else if (idle > resetMs || acc * dx < 0) {
        // 累积超时 或 方向反转 → 清零重新计数
        acc = 0;
      }

      acc += dx;
      if (Math.abs(acc) < threshold) return null;
      const dir: Direction = acc > 0 ? 'next' : 'prev';
      acc = 0;
      locked = true;
      return dir;
    },
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/lib/swipe.test.ts`
Expected: PASS（10 个用例全绿）

- [ ] **Step 5: 全量校验并提交**

Run: `make check`
Expected: 全绿

```bash
rtk git add src/lib/swipe.ts src/lib/swipe.test.ts
rtk git commit -m "feat(swipe): 横滑手势判定状态机（累积触发 + 静止解锁）"
```

---

### Task 3: 事件桥接 hook（`hooks/useHorizontalSwipe.ts`）

两个反直觉但必须照做的点：

1. **`preventDefault()` 的范围**：凡通过前置过滤且 `isHorizontal` 为真的事件一律拦，**与状态机是否触发、是否锁定无关**。Chrome 的历史前进/后退手势正是由整条惯性事件流喂出来的；只在命中时才拦，惯性尾巴会把管理页整页滑走。监听必须 `{ passive: false }`，否则 `preventDefault()` 无效。
2. **时间源用 `performance.now()`**，不用 `event.timeStamp`：jsdom 的 `WheelEvent.timeStamp` 是构造时确定的只读属性，测试里造带时间差的序列只能逐个 `Object.defineProperty` 改写。

**Files:**
- Create: `src/hooks/useHorizontalSwipe.ts`
- Create: `src/hooks/useHorizontalSwipe.test.ts`

**Interfaces:**
- Consumes: `createSwipeDetector` / `isHorizontal` from `src/lib/swipe.ts`（Task 2）；`type Direction` from `src/lib/mode.ts`（Task 1）
- Produces: `useHorizontalSwipe(onSwipe: (dir: Direction) => void): void`（无返回值、无 `enabled` 开关）

- [ ] **Step 1: 写失败测试**

创建 `src/hooks/useHorizontalSwipe.test.ts`。注意 `vi.useFakeTimers({ toFake: ['performance'] })`：Vitest 默认的 `toFake` **不含** `performance`，不显式声明则 `advanceTimersByTime` 推不动 `performance.now()`，锁定/解锁用例就会依赖真实墙钟而飘。

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorizontalSwipe } from './useHorizontalSwipe';

// 只 fake performance：hook 的时间源是 performance.now()，与 setTimeout 无关
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance'] });
});
afterEach(() => {
  vi.useRealTimers();
});

function wheel(init: WheelEventInit): WheelEvent {
  const e = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
  act(() => {
    window.dispatchEvent(e);
  });
  return e;
}

describe('useHorizontalSwipe', () => {
  it('横向达阈值：调回调并拦截默认行为', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    const e = wheel({ deltaX: 100, deltaY: 0 });
    expect(onSwipe).toHaveBeenCalledWith('next');
    expect(e.defaultPrevented).toBe(true);
  });

  it('向右推得到 prev', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    wheel({ deltaX: -100, deltaY: 0 });
    expect(onSwipe).toHaveBeenCalledWith('prev');
  });

  it('横向但未达阈值：不调回调，仍然 preventDefault', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    const e = wheel({ deltaX: 30, deltaY: 0 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });

  it('锁定态的惯性事件：不调回调，仍然 preventDefault', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    wheel({ deltaX: 100, deltaY: 0 });
    vi.advanceTimersByTime(50);
    const tail = wheel({ deltaX: 90, deltaY: 0 });
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(tail.defaultPrevented).toBe(true);
  });

  it('纵向滚动：不调回调、不 preventDefault', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    const e = wheel({ deltaX: 0, deltaY: 120 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('shiftKey 是横向滚动意图：完全忽略', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    const e = wheel({ deltaX: 100, deltaY: 0, shiftKey: true });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('deltaMode 非像素（鼠标滚轮）：完全忽略', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    const e = wheel({ deltaX: 100, deltaY: 0, deltaMode: 1 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });

  it('指针按下期间不响应，抬起后恢复', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    wheel({ deltaX: 100, deltaY: 0 });
    expect(onSwipe).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    wheel({ deltaX: 100, deltaY: 0 });
    expect(onSwipe).toHaveBeenCalledWith('next');
  });

  it('pointercancel 同样解除抑制', () => {
    const onSwipe = vi.fn();
    renderHook(() => useHorizontalSwipe(onSwipe));
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    act(() => {
      window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));
    });
    wheel({ deltaX: 100, deltaY: 0 });
    expect(onSwipe).toHaveBeenCalledWith('next');
  });

  it('重渲染不重置累积状态', () => {
    const onSwipe = vi.fn();
    const { rerender } = renderHook(({ cb }) => useHorizontalSwipe(cb), {
      initialProps: { cb: onSwipe },
    });
    wheel({ deltaX: 50, deltaY: 0 });
    expect(onSwipe).not.toHaveBeenCalled();
    rerender({ cb: onSwipe });
    wheel({ deltaX: 50, deltaY: 0 }); // 累积 100 ≥ 80
    expect(onSwipe).toHaveBeenCalledWith('next');
  });

  it('回调更新后用的是最新闭包', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useHorizontalSwipe(cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    wheel({ deltaX: 100, deltaY: 0 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('next');
  });

  it('卸载后移除监听', () => {
    const onSwipe = vi.fn();
    const { unmount } = renderHook(() => useHorizontalSwipe(onSwipe));
    unmount();
    const e = wheel({ deltaX: 100, deltaY: 0 });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/hooks/useHorizontalSwipe.test.ts`
Expected: FAIL —— `Failed to resolve import "./useHorizontalSwipe"`

- [ ] **Step 3: 写最小实现**

创建 `src/hooks/useHorizontalSwipe.ts`：

```ts
import { useEffect, useRef } from 'react';
import type { Direction } from '../lib/mode';
import { createSwipeDetector, isHorizontal } from '../lib/swipe';

// 触控板双指横滑 → 模式切换（spec 2026-08-17-mode-swipe §5）
// 监听挂 window：整页无死区，Hero / 控制条 / 主区 / 侧栏任意位置都生效
export function useHorizontalSwipe(onSwipe: (dir: Direction) => void): void {
  // 回调每次渲染都是新函数；存 ref 供固定监听读最新闭包，否则其中的 mode 会陈旧
  const cbRef = useRef(onSwipe);
  useEffect(() => {
    cbRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    // detector 与指针态建在效果体内：依赖数组为空 → 只建一次，累积与锁定跨渲染持久
    const detector = createSwipeDetector();
    let pointerDown = false;

    const onWheel = (e: WheelEvent) => {
      // 非像素单位（鼠标滚轮的行/页）px 阈值无意义；
      // Shift + 滚轮是用户的横向滚动意图；指针按下期间可能在拖拽，一律不切换
      if (e.deltaMode !== 0 || e.shiftKey || pointerDown) return;
      if (!isHorizontal(e.deltaX, e.deltaY)) return;
      // 凡横向一律拦截，与状态机是否触发无关——
      // Chrome 的历史前进/后退手势由整条惯性事件流喂出，漏拦会把整页滑走
      e.preventDefault();
      const dir = detector.feed(e.deltaX, e.deltaY, performance.now());
      if (dir) cbRef.current(dir);
    };
    const onPointerDown = () => {
      pointerDown = true;
    };
    const onPointerUp = () => {
      pointerDown = false;
    };

    // non-passive，否则 preventDefault 无效
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/hooks/useHorizontalSwipe.test.ts`
Expected: PASS（12 个用例全绿）

- [ ] **Step 5: 全量校验并提交**

Run: `make check`
Expected: 全绿

```bash
rtk git add src/hooks/useHorizontalSwipe.ts src/hooks/useHorizontalSwipe.test.ts
rtk git commit -m "feat(hooks): useHorizontalSwipe 桥接 wheel 事件到手势状态机"
```

---

### Task 4: 接线与方向性过场（`App.tsx`、`styles.css`）

手势与点击收敛到同一个 `switchMode`，差别只在方向来源：点击不传 `dir` → 走线性 `directionBetween`（分段按钮在空间上是直线，点右边就从右侧滑入）；手势传自己的方向 → 走循环 `cycleMode`。

**Files:**
- Modify: `src/manager/App.tsx`（import 段、`AppInner` 内 state 与 `switchMode`、`Toolbar` 的 `onMode`、`<main>` 的 className）
- Modify: `src/manager/styles.css:2-3`（`html` 兜底）与 `:203-216`（keyframes）
- Modify: `src/manager/App.test.tsx`（增补 4 个用例）

**Interfaces:**
- Consumes: `useHorizontalSwipe`（Task 3）；`cycleMode` / `directionBetween` / `type Direction`（Task 1）
- Produces: 无对外新 API。`<main>` 的 class 由 `main view-switch` 变为 `main view-switch dir-next` / `dir-prev`。

- [ ] **Step 1: 写失败测试**

在 `src/manager/App.test.tsx` 的 `describe('App', ...)` 内追加以下四个用例（放在既有「全部模式：固定域名视图…」用例之后即可）。同时把文件首行的 RTL import 补上 `act`：

```tsx
import { act, render, screen, waitFor, within } from '@testing-library/react';
```

用例（`seedTwoWindows` 已存在于本文件顶部，直接复用）：

```tsx
  // ===== 触控板双指横滑切换模式（spec 2026-08-17-mode-swipe）=====
  const swipe = async (init: WheelEventInit) => {
    await act(async () => {
      window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init }));
    });
  };
  const segPressed = (label: string) =>
    screen.getByText(label).closest('button')?.getAttribute('aria-pressed');

  it('双指向左推：窗口模式 → 全部模式，过场方向为 next', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await swipe({ deltaX: 100, deltaY: 0 });
    expect(segPressed('全部模式')).toBe('true');
    expect(document.querySelector('main')).toHaveClass('dir-next');
  });

  it('双指向右推：窗口模式一步直达已保存会话（首尾循环），过场方向为 prev', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await swipe({ deltaX: -100, deltaY: 0 });
    expect(segPressed('已保存会话')).toBe('true');
    expect(document.querySelector('main')).toHaveClass('dir-prev');
  });

  it('纵向滚动不切换模式', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await swipe({ deltaX: 0, deltaY: 200 });
    expect(segPressed('窗口模式')).toBe('true');
  });

  it('Shift + 横向滚轮是横向滚动意图，不切换模式', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await swipe({ deltaX: 100, deltaY: 0, shiftKey: true });
    expect(segPressed('窗口模式')).toBe('true');
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: FAIL —— 前两个新用例失败（`aria-pressed` 仍是 `窗口模式` 的 `true`；`main` 没有 `dir-next` class）；后两个「不切换」的用例此时会假通过，它们是回归护栏。

- [ ] **Step 3: App.tsx 接线**

1）import 段：在既有 `import { useTheme } from '../hooks/useTheme';`（约 25 行）之后加一行，并在 `import { managerUrl } from '../lib/manager-url';` 附近按现有分组补上 `lib/mode`：

```tsx
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe';
```

```tsx
import { cycleMode, directionBetween, type Direction } from '../lib/mode';
```

（`lib/*` 的 import 是按路径字母序排的，`mode` 放在 `manager-url` 与 `open-window` 之间。）

2）在 `const [mode, setMode] = useState<Mode>('window');`（约 68 行）之后加 `dir` state：

```tsx
  // 过场方向：点击走线性、手势走循环，统一由 switchMode 写入（spec 2026-08-17-mode-swipe §7）
  const [dir, setDir] = useState<Direction>('next');
```

3）在 `previewByTabId` 的 `useMemo` 结束之后、`// 轻量 toast` 注释之前，插入切换入口与手势接线：

```tsx
  // 手势与点击收敛到同一入口：点击不传 dir → 线性方向；手势自带方向
  const switchMode = (next: Mode, d: Direction = directionBetween(mode, next)) => {
    setDir(d);
    setMode(next);
    // 手势切换不经过鼠标，不会触发按钮的 mouseleave，去重预览需显式清理
    setDedupePreview(false);
  };

  // 触控板双指横滑：循环序，任意模式一次手势直达
  useHorizontalSwipe((d) => switchMode(cycleMode(mode, d), d));
```

4）`Toolbar` 的 `onMode`（约 482 行）：

```tsx
        onMode={(m) => switchMode(m)}
```

5）`<main>` 的 className（约 490 行）：

```tsx
        <main className={`main view-switch dir-${dir}`} key={mode}>
```

- [ ] **Step 4: styles.css 换方向性 keyframes**

把 `src/manager/styles.css:204-216` 的 `viewIn` 一段整体替换为：

```css
/* 视图过场：方向由 App 的 dir state 决定（spec 2026-08-17-mode-swipe §7）
   next = 新视图从右侧滑入，prev = 从左侧滑入；时长与曲线沿用原 viewIn */
@keyframes viewInNext {
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes viewInPrev {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.main.view-switch.dir-next {
  animation: viewInNext 0.18s cubic-bezier(0.2, 0, 0, 1);
}
.main.view-switch.dir-prev {
  animation: viewInPrev 0.18s cubic-bezier(0.2, 0, 0, 1);
}
```

再在文件顶部 `@import '../styles/tokens.css';`（第 2 行）之后插入兜底规则：

```css

/* 兜底：拦不到的横向 wheel 不触发 Chrome 历史手势；
   主手段是 useHorizontalSwipe 的 preventDefault，这条只覆盖 hook 挂载前的首帧 */
html {
  overscroll-behavior-x: none;
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: PASS，含四个新用例；既有点击切模式的用例（「全部模式：固定域名视图…」等）不受影响

- [ ] **Step 6: 全量校验**

Run: `make check`
Expected: 全绿（fmt-check + lint + typecheck + test）

- [ ] **Step 7: 提交**

```bash
rtk git add src/manager/App.tsx src/manager/App.test.tsx src/manager/styles.css
rtk git commit -m "feat(manager): 双指横滑循环切换模式与方向性过场"
```

- [ ] **Step 8: 浏览器验收（人工，一次即可）**

Run: `pnpm build`，在 `chrome://extensions` 对本扩展点 ↻ 重新加载，打开管理页后逐条确认：

1. 触控板双指向左推 → 窗口 → 全部 → 已保存会话 → 回到窗口；向右推反向且同样循环。
2. 在 Hero、控制条、侧栏上横滑同样生效（整页无死区）。
3. 横滑期间**页面不会整页左右滑走**、不触发浏览器的历史前进/后退。
4. 纵向滚动照常；Shift + 滚轮不切模式。
5. 按住某一行拖拽期间横滑不切模式。
6. 新视图带方向滑入：向左推时从右侧进，向右推时从左侧进；点击最右的分段按钮仍是从右侧进。

---

## Self-Review

**Spec 覆盖对照：**

| Spec 章节 | 落到 |
| --- | --- |
| §2 手势语义（MODES 顺序、左推 next / 右推 prev、整页监听、仅 wheel deltaX） | Task 1 `MODES`/`cycleMode`；Task 3 hook（window 监听、deltaMode 过滤） |
| §4 手势判定（isHorizontal、累积触发、静止解锁、方向反转、累积超时、无定时器） | Task 2 全部 |
| §5 事件桥接（前置过滤、preventDefault 范围、performance.now、跨渲染持久、无 enabled） | Task 3 全部 |
| §6 模式常量与循环（cycleMode 取模、directionBetween 线性、Mode 迁入 lib） | Task 1 全部 |
| §7 接线与过场（dir state、switchMode、dir- class、两条 keyframes、overscroll 兜底） | Task 4 Step 3/4 |
| §8 边界（指针态抑制拖拽、去重预览清理、reduced-motion 继承、无横向滚动容器、展开态） | Task 3（指针态）、Task 4 Step 3（`setDedupePreview(false)`）；reduced-motion 由 `tokens.css` 既有全局规则覆盖新 keyframes，无需改动；展开态与滚动位置为现状不变，无改动 |
| §9 测试要点 1–4 | Task 1/2/3/4 的 Step 1 逐条对应 |
| §10 非目标 | 计划内无对应实现，`Global Constraints` 已声明不做 |

**类型一致性核对：** `Direction` 仅在 `lib/mode.ts` 定义，`lib/swipe.ts`、`hooks/useHorizontalSwipe.ts`、`manager/App.tsx` 均从该处 import；`Mode` 同理，`Toolbar.tsx` 只再导出。`feed(dx, dy, now)` 三参签名在 Task 2 定义、Task 3 调用一致；`createSwipeDetector()` 在 Task 3 无参调用，默认值在 Task 2 全部给齐。

**已知风险：** `vi.useFakeTimers({ toFake: ['performance'] })` 与 jsdom 的 `WheelEvent` / `PointerEvent` 构造已在本仓库实测可用（Vitest 4.1.10 + jsdom 30），不必再验证。
