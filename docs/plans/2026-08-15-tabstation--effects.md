# Tab Station 子计划：关闭动效（--effects）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移植 tab-out（MIT）的 swoosh 音效 + 纸屑 + 退场动效（spec §5.10），并实现批量关闭编排（音效一次、粒子逐行错开 40ms）。

**Architecture:** 移植源 `refs/tab-out/extension/app.js` 的 `playCloseSound` / `shootConfetti` / `animateCardOut`，拆为 `sound.ts` / `confetti.ts` / `exit.ts` 三个模块 + `batch.ts` 编排层。音效与纸屑是 DOM/Audio 副作用，只做冒烟级测试；编排逻辑用 fake timers TDD。

**Tech Stack:** Web Audio API + rAF + Vitest fake timers。

**Depends on:** `--scaffold`。

## Global Constraints

- 音效纯 Web Audio 合成，无音频文件；Audio 不可用时静默失败
- 稍后阅读条目删除不使用本动效（仅 CSS 退场，见 --ui-panels）
- 注释用简体中文

---

### Task 1: 移植三个基础动效

**Files:**
- Create: `src/lib/effects/sound.ts`, `src/lib/effects/confetti.ts`, `src/lib/effects/exit.ts`
- Modify: `src/manager/styles.css`（追加 `.closing` 规则）
- Test: `src/lib/effects/effects.test.ts`

**Interfaces:**
- Produces:
  - `playCloseSound(): void`
  - `shootConfetti(x: number, y: number): void`
  - `animateElementOut(el: HTMLElement, onDone?: () => void): void`（加 `.closing`，300ms 后回调）
  - Task 2 与全部 UI 子计划消费

- [ ] **Step 1: 写失败测试（冒烟级：副作用模块只验证可观测行为）**

```ts
import { describe, expect, it, vi } from 'vitest';
import { animateElementOut } from './exit';
import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';

describe('effects 冒烟', () => {
  it('playCloseSound：AudioContext 不可用时静默不抛', () => {
    // jsdom 无 AudioContext——恰好就是"不可用"场景
    expect(() => playCloseSound()).not.toThrow();
  });

  it('shootConfetti：向 body 添加 17 个粒子元素', () => {
    shootConfetti(100, 100);
    expect(document.body.querySelectorAll('[data-confetti]')).toHaveLength(17);
  });

  it('animateElementOut：加 .closing，300ms 后回调', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const done = vi.fn();
    animateElementOut(el, done);
    expect(el.classList.contains('closing')).toBe(true);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/effects/effects.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现（移植自 refs/tab-out/extension/app.js，MIT）**

`src/lib/effects/sound.ts`：

```ts
// swoosh 音效：白噪声 buffer + 带通滤波 4000Hz 指数扫到 400Hz，0.25s（移植自 tab-out）
export function playCloseSound(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor!();
    const t = ctx.currentTime;
    const duration = 0.25;

    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // 包络：前 10% 快速起音，之后平滑衰减
    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length;
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // Audio 不可用——静默失败（spec §5.10）
  }
}
```

`src/lib/effects/confetti.ts`：

```ts
// 纸屑：17 个粒子从 (x,y) 迸发，随机角度 + 上抛偏置 + 重力，700–900ms（移植自 tab-out）
const COLORS = [
  '#c8713a', '#e8a070', '#5a7a62', '#8aaa92',
  '#5a6b7a', '#8a9baa', '#d4b896', '#b35a5a',
];

export function shootConfetti(x: number, y: number): void {
  const particleCount = 17;
  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    el.dataset.confetti = '';
    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6; // 5–11px
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px; background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none; z-index: 9999;
      transform: translate(-50%, -50%); opacity: 1;
    `;
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 80; // 上抛偏置
    const gravity = 200;
    const startTime = performance.now();
    const duration = 700 + Math.random() * 200;

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);
      if (progress >= 1) {
        el.remove();
        return;
      }
      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${elapsed * 200 * (isCircle ? 0 : 1)}deg)`;
      el.style.opacity = String(progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
```

`src/lib/effects/exit.ts`：

```ts
// 元素退场：加 .closing（CSS fade + scale 300ms），动画结束后回调
export function animateElementOut(el: HTMLElement, onDone?: () => void): void {
  el.classList.add('closing');
  window.setTimeout(() => onDone?.(), 300);
}
```

`src/manager/styles.css` 追加：

```css
.closing {
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/effects/effects.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/effects src/manager/styles.css
rtk git commit -m "feat(effects): 移植 tab-out swoosh 音效/纸屑/退场（MIT）"
```

---

### Task 2: 批量关闭编排 `batch.ts`

**Files:**
- Create: `src/lib/effects/batch.ts`
- Test: `src/lib/effects/batch.test.ts`

**Interfaces:**
- Consumes: Task 1 三个函数
- Produces:
  - `interface CloseEntry { tabId: number; el: HTMLElement | null }`
  - `closeTabsWithEffect(entries: CloseEntry[]): Promise<void>` —— 音效播一次；粒子/退场按行错开 40ms；动画完成后统一 `chrome.tabs.remove(全部 id)`。全部 UI 子计划的关 tab 动作（单关、去重、稍后阅读收纳）都走它

- [ ] **Step 1: 写失败测试（mock 掉副作用模块 + fake timers）**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../../test/chrome-mock';

vi.mock('./sound', () => ({ playCloseSound: vi.fn() }));
vi.mock('./confetti', () => ({ shootConfetti: vi.fn() }));

import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';
import { closeTabsWithEffect } from './batch';

function entry(tabId: number) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return { tabId, el };
}

describe('closeTabsWithEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('空列表：无任何副作用', async () => {
    await closeTabsWithEffect([]);
    expect(playCloseSound).not.toHaveBeenCalled();
  });

  it('批量：音效只播一次，粒子按 40ms 错开，动画后统一 remove', async () => {
    const { chromeMock } = getChromeMock();
    const entries = [entry(1), entry(2), entry(3)];
    const done = closeTabsWithEffect(entries);

    expect(playCloseSound).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(0);
    expect(shootConfetti).toHaveBeenCalledTimes(1); // 第 0 行立即
    vi.advanceTimersByTime(40);
    expect(shootConfetti).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(40);
    expect(shootConfetti).toHaveBeenCalledTimes(3);

    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300); // 最后一行的退场动画
    await done;
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('el 为 null 的行不出粒子但 tab 照常关闭', async () => {
    const { chromeMock } = getChromeMock();
    const done = closeTabsWithEffect([{ tabId: 7, el: null }]);
    vi.advanceTimersByTime(300);
    await done;
    expect(shootConfetti).not.toHaveBeenCalled();
    expect(chromeMock.tabs.remove).toHaveBeenCalledWith([7]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/lib/effects/batch.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

```ts
import { animateElementOut } from './exit';
import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';

export interface CloseEntry {
  tabId: number;
  el: HTMLElement | null;
}

// 批量关闭编排（spec §5.10）：音效一次；纸屑/退场逐行错开 40ms（连环消失）；
// 全部动画结束后统一 tabs.remove
const STAGGER_MS = 40;
const EXIT_MS = 300;

export async function closeTabsWithEffect(entries: CloseEntry[]): Promise<void> {
  if (entries.length === 0) return;
  playCloseSound();
  entries.forEach((entry, i) => {
    window.setTimeout(() => {
      if (!entry.el) return;
      const rect = entry.el.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      animateElementOut(entry.el);
    }, i * STAGGER_MS);
  });
  const total = (entries.length - 1) * STAGGER_MS + EXIT_MS;
  await new Promise((resolve) => window.setTimeout(resolve, total));
  await chrome.tabs.remove(entries.map((e) => e.tabId));
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/lib/effects/batch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/effects/batch.ts src/lib/effects/batch.test.ts
rtk git commit -m "feat(effects): 批量关闭编排（音效一次、粒子错开、统一 remove）"
```
