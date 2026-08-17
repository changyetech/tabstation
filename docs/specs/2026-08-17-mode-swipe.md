# 模式横滑切换：触控板双指横滑循环切换三模式

- 日期：2026-08-17
- 状态：待实现
- 关联：扩展 [2026-08-16-manager-redesign.md](2026-08-16-manager-redesign.md) §3.1 主区模式切换（控制条分段按钮）与 view-switch 过场；分段按钮的既有点击行为不变，新增手势为并列入口。

## 1. 目标

管理页主区的三个**模式**（窗口 / 全部 / 已保存会话，见 [CONTEXT.md](../../CONTEXT.md)）除点击控制条分段按钮外，支持**触控板双指横滑**切换，且首尾**循环**。切换过场由现有纵向淡入改为带方向的横向滑入。

范围仅管理页；设置页不涉及。

## 2. 手势语义

`MODES = ['window', 'all', 'sessions']`，顺序与控制条分段按钮从左到右一致。

- 双指**向左推**（内容左移，`deltaX > 0`）→ `next`：窗口 → 全部 → 已保存会话 → **回到窗口**。
- 双指**向右推**（`deltaX < 0`）→ `prev`：反向遍历，同样循环。

**生效范围为整页**（`window` 上监听）：Hero、控制条、主区、稍后阅读侧栏任意位置横滑均切换，无死区。

**输入方式仅 wheel 的 `deltaX`**。不做键盘方向键、不做触摸屏 swipe、不做鼠标按住拖拽画布——后者与「整行即拖拽把手」的 dnd-kit 交互冲突。

## 3. 手势判定（`src/lib/swipe.ts`，纯状态机）

触控板的 wheel 是连续事件流且带惯性尾巴：一次挥动可打出数十个事件、惯性再延续数百毫秒。天真的「单事件超阈值即切换」会让一次手势连切多次。故采用**累积触发 + 静止解锁**状态机。

```
createSwipeDetector(opts?): { feed(dx, dy, now): 'prev' | 'next' | null }
```

纯函数模块：不读时钟（`now` 由调用方传入）、不碰 DOM、不引 React。

判定规则与默认参数：

| 项 | 规则 | 默认值 |
| --- | --- | --- |
| 横向判定 | `\|dx\| > \|dy\| * ratio` 才计入累积，否则视作纵向滚动直接忽略 | `ratio = 1.2` |
| 触发阈值 | 同方向累积 `\|dx\|` 达到阈值即触发一次 | `80`（px） |
| 触发后加锁 | 触发后进入锁定态，忽略后续事件，直到**连续无横向事件**达到静止时长才解锁 | `260`（ms） |
| 方向反转 | 累积期间 `dx` 符号反转 → 累积清零，从新方向重新计数 | — |
| 累积超时 | 距上一次计入事件超过该时长 → 累积清零（避免极慢速推动误触） | `400`（ms） |

解锁**不用定时器**：锁定态下每来一个事件都记录时间戳，下次 `feed` 时若 `now - 上次横向事件时间 >= 静止时长` 则解锁并把本次事件计入新一轮累积。因此整条惯性尾巴期间不会二次触发，状态机也保持无副作用、可用固定时间戳序列测试。

## 4. 事件桥接（`src/hooks/useHorizontalSwipe.ts`）

薄封装：在 `window` 上注册 `wheel` 监听，把 `(deltaX, deltaY, event.timeStamp)` 喂给状态机，命中则调用回调 `(dir: 'prev' | 'next') => void`。

- **必须 non-passive**（`{ passive: false }`）：需要 `preventDefault()`。
- **对判定为横向的事件调用 `preventDefault()`**：Chrome 中双指横滑触发历史前进/后退，管理页作为 SPA 会被整页滑走。纵向事件不拦截，页面滚动照常。
- 提供 `enabled` 开关，供调用方在拖拽期间关停（见 §7）。

## 5. 模式常量与循环（`src/lib/mode.ts`）

新建纯逻辑模块，承载模式的顺序与方向语义：

```
export type Mode = 'window' | 'all' | 'sessions'
export const MODES: readonly Mode[]
cycleMode(mode: Mode, dir: 'prev' | 'next'): Mode          // 首尾循环
directionBetween(from: Mode, to: Mode): 'prev' | 'next'     // 供点击切换算过场方向
```

- `cycleMode`：按 `MODES` 下标 ±1 取模，`sessions` 的 next 为 `window`，`window` 的 prev 为 `sessions`。
- `directionBetween`：`diff = (toIndex - fromIndex + 3) % 3`，`1 → 'next'`，`2 → 'prev'`，`0` 视作 `'next'`（无位移，方向不参与渲染）。因此点击「窗口 → 已保存会话」走循环近路，播向右滑入，与手势语义自洽。

**`Mode` 类型从 `components/Toolbar.tsx` 迁入本模块**，`Toolbar.tsx` 改为 `export type { Mode }` 再导出——`App.tsx` 等既有 import 路径不变，不破坏现有 API。（类型属领域逻辑，放 `lib/` 才符合分层约定；`lib/` 不得反向依赖 `components/`。）

## 6. 接线与过场（`src/manager/App.tsx`、`styles.css`）

- App 新增 `dir` state（初值 `'next'`），与 `mode` 并存。
- 手势与点击**收敛到同一个 `switchMode(next: Mode)`**：`setDir(directionBetween(mode, next))` → `setMode(next)` → `setDedupePreview(false)`。`Toolbar` 的 `onMode` 与手势回调都走它。
- `<main>` 的 className 由 `main view-switch` 扩为 `main view-switch dir-${dir}`；`key={mode}` 重挂载机制不变。
- 过场动画：现有单一 `viewIn`（纵向 5px 淡入）替换为两条方向性 keyframes，时长与曲线沿用（`0.2s cubic-bezier(0.2, 0, 0, 1)`）：
  - `viewInNext`：`from { opacity: 0; transform: translateX(24px) }`（新视图从右侧滑入）
  - `viewInPrev`：`from { opacity: 0; transform: translateX(-24px) }`
- 首屏挂载时 `dir` 为 `'next'`，视觉上等价于现在的淡入，无需特判。
- `overscroll-behavior-x: none` 加在页面根元素上，作为 `preventDefault` 之外的第二道保险（防历史导航手势）。

## 7. 边界情况

- **拖拽中不切换**：dnd-kit 拖拽进行时（`dragGhost !== null`）关停手势（`enabled: false`），避免拖到一半视图被换掉。
- **去重预览残留**：`switchMode` 统一 `setDedupePreview(false)`。点击切换时鼠标离开按钮会自然触发 `mouseleave`，手势切换不经过鼠标，故需显式清理。
- **减弱动态效果**：`src/styles/tokens.css` 已全局压制 animation/transition 时长，横向过场自动继承，本 spec 不额外处理。
- **展开态与滚动位置**：`expandedKeys` 是 App 级共享 state，跨模式保留（现状不变）；`key={mode}` 重挂载导致主区滚动位置重置，与现有点击切换行为一致，不改。
- **会话重命名输入框聚焦时**：wheel 不影响文本输入，手势照常生效，不做特判。

## 8. 测试要点（TDD）

1. `lib/mode.test.ts` — `cycleMode` 三模式正反向遍历与首尾回绕；`directionBetween` 相邻/跨越/相同三类取值。
2. `lib/swipe.test.ts` — 喂事件序列断言返回值：单次大 `dx` 触发；多次小 `dx` 累积触发；触发后紧跟的惯性事件流**不再触发**；静止超时后可再次触发；纵向（`|dy|` 占优）与斜向不触发；方向反转清零后不误触；累积超时清零。
3. `hooks/useHorizontalSwipe.test.ts` — jsdom 派发 `WheelEvent`：横向命中调回调且 `defaultPrevented === true`；纵向不调回调且不 preventDefault；`enabled: false` 时完全不响应；卸载后移除监听。
4. `App.test.tsx` 增补 — 派发 `deltaX: 100` 的 wheel → 主区由窗口模式切到全部模式；连续三次（各自间隔足够解锁）回到窗口模式，验证循环；`deltaY` 滚动不切换。

## 9. 非目标

- 全程跟手（三视图并排 `translateX` 实时跟随、松手吸附）——需同时挂载三份列表与各自的 dnd 上下文，复杂度与性能代价不成比例。
- 键盘方向键切换、触摸屏 swipe、鼠标拖拽画布。
- 页点指示器等额外位置提示——控制条分段按钮的高亮态已标明当前模式。
- 手势灵敏度的用户可配置项（阈值写死在 `lib/swipe.ts`）。
