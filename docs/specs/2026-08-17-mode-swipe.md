# 模式横滑切换：触控板双指横滑循环切换三模式

- 日期：2026-08-17
- 修订：2026-08-17（设计评审后）
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

**输入方式仅触控板 wheel 的 `deltaX`**。不做键盘方向键、不做触摸屏 swipe、不做鼠标按住拖拽画布——后者与「整行即拖拽把手」的 dnd-kit 交互冲突。

## 3. 设计取舍

### 3.1 循环序 vs 线性钳制

三个模式构成**环**而非线段，被采纳的核心理由是：**三元环的直径为 1**，任意模式都能被一次手势直达（`window → sessions` 就是一次 `prev`）。线性钳制下 `window ↔ sessions` 需要两次手势，而 §4 的惯性锁定要求两次手势之间必须有静止间隔，这个远跳会在手感上退化为「滑一下、明显等一拍、再滑一下」。

被放弃的方案：线性钳制 + 边界静默（或橡皮筋回弹）。它的优点是与分段按钮画出的直线心智模型一致——从最右格向右滑却跳到最左格，存在「传送」感。放弃理由：三个格子的环两三次即形成肌肉记忆，且分段按钮的高亮态始终指明当前位置，不存在迷失；而边界静默会让用户无法区分「手势没被识别」与「已到边界」，要补反馈就得为不触发重挂载的边界情形另加一套动画机制，成本高于它解决的问题。

此决策**易于逆转**（`cycleMode` 改为钳制即可），故不单独立 ADR，理由记录于本节。

### 3.2 惯性锁定的已知代价

触发后必须等待横向事件静止才解锁（§4），而 macOS 触控板的惯性尾巴实际可持续 600ms～1.5s。因此**连续两次手势之间存在强制停顿**。在循环序下这一代价基本不落到日常路径上（任意目标一次可达），仅在用户误切后想立刻反向纠正时被感知；此时分段按钮始终是无延迟的替代路径。不采用「上升沿解锁」（锁定态下 `|dx|` 回升即判为新手势）——它增加状态机复杂度与误判风险，收益不成比例。

## 4. 手势判定（`src/lib/swipe.ts`，纯状态机）

触控板的 wheel 是连续事件流且带惯性尾巴：一次挥动可打出数十个事件、惯性再延续数百毫秒。天真的「单事件超阈值即切换」会让一次手势连切多次。故采用**累积触发 + 静止解锁**状态机。

```
isHorizontal(dx, dy, ratio?): boolean
createSwipeDetector(opts?): { feed(dx, dy, now): 'prev' | 'next' | null }
```

纯函数模块：不读时钟（`now` 由调用方传入）、不碰 DOM、不引 React。`Direction`（`'prev' | 'next'`）类型定义在 `lib/mode.ts`，本模块 import 复用。

判定规则与默认参数：

| 项 | 规则 | 默认值 |
| --- | --- | --- |
| 横向判定 | `\|dx\| > \|dy\| * ratio` 才计入累积，否则视作纵向滚动直接忽略 | `ratio = 1.2` |
| 触发阈值 | 同方向累积 `\|dx\|` 达到阈值即触发一次 | `80`（px） |
| 触发后加锁 | 触发后进入锁定态，忽略后续事件，直到**连续无横向事件**达到静止时长才解锁 | `260`（ms） |
| 方向反转 | 累积期间 `dx` 符号反转 → 累积清零，从新方向重新计数 | — |
| 累积超时 | 距上一次计入事件超过该时长 → 累积清零（避免极慢速推动误触） | `400`（ms） |

解锁**不用定时器**：锁定态下每来一个事件都记录时间戳，下次 `feed` 时若 `now - 上次横向事件时间 >= 静止时长` 则解锁并把本次事件计入新一轮累积。因此整条惯性尾巴期间不会二次触发，状态机也保持无副作用、可用固定时间戳序列测试。

**`isHorizontal` 单独导出**：`feed` 内部用它决定计不计入累积，事件桥接层（§5）用它决定拦不拦默认行为。ratio 判定因此只有一份真值来源，无需在 hook 里重算。

## 5. 事件桥接（`src/hooks/useHorizontalSwipe.ts`）

```
useHorizontalSwipe(onSwipe: (dir: Direction) => void): void
```

薄封装：在 `window` 上注册 `wheel` 监听，把 `(deltaX, deltaY, now)` 喂给状态机，命中则调用 `onSwipe`。

**前置过滤**（不进状态机、不 `preventDefault`）：

- `e.deltaMode !== 0`：非像素单位（鼠标滚轮常为 `DOM_DELTA_LINE`，`deltaX` 单位是「行」），px 阈值对其无意义。
- `e.shiftKey`：Shift + 滚轮是用户的横向滚动意图，不是模式切换。
- 指针按下期间（见 §8 拖拽抑制）。

**`preventDefault()` 的范围**：凡通过前置过滤且 `isHorizontal(dx, dy)` 为真的事件，**一律 `preventDefault()`，与状态机是否触发、是否处于锁定态无关**。Chrome 的历史前进/后退手势正是由整条惯性事件流喂出来的，若只在状态机命中时才拦，惯性尾巴会把管理页整页滑走。监听必须 **non-passive**（`{ passive: false }`）。纵向事件不拦截，页面滚动照常。

**时间源用 `performance.now()`**，不用 `event.timeStamp`。二者在真实浏览器中同基准，但 jsdom 的 `WheelEvent.timeStamp` 是构造时确定的只读属性，测试中构造带时间差的事件序列只能逐个 `Object.defineProperty` 改写；`performance.now()` 则可被 Vitest 的 fake timers 直接推进。

**状态必须跨渲染持久**：detector 与 `onSwipe` 回调各存一个 `useRef`，注册监听的 `useEffect` 依赖数组为空。若把 detector 建在效果体内并让效果依赖回调，每次渲染重注册都会重置累积与锁定状态；若不用回调 ref，则 `onSwipe` 内闭包捕获的 `mode` 会陈旧。

不提供 `enabled` 开关——拖拽抑制已由 hook 内部的指针状态承担（§8），再无其他调用方，留着即是无人使用的可配置性。

## 6. 模式常量与循环（`src/lib/mode.ts`）

新建纯逻辑模块，承载模式的顺序与方向语义：

```
export type Mode = 'window' | 'all' | 'sessions'
export type Direction = 'prev' | 'next'
export const MODES: readonly Mode[]
cycleMode(mode: Mode, dir: Direction): Mode              // 首尾循环
directionBetween(from: Mode, to: Mode): Direction        // 供点击切换算过场方向
```

- `cycleMode`：按 `MODES` 下标 ±1 **取模**，`sessions` 的 next 为 `window`，`window` 的 prev 为 `sessions`。仅服务手势。
- `directionBetween`：按下标**线性**比较，`toIndex > fromIndex → 'next'`，否则 `'prev'`（相同视作 `'next'`，无位移，方向不参与渲染）。**不取模**——分段按钮在空间上画的是一条直线，点击右边的格子就该从右侧滑入；循环近路只是手势的可达性性质，不应反过来决定点击的视觉方向。

手势不经过 `directionBetween`：它自带方向，由 §7 的 `switchMode` 直接透传。

**`Mode` 类型从 `components/Toolbar.tsx` 迁入本模块**，`Toolbar.tsx` 改为 `export type { Mode }` 再导出——`App.tsx` 等既有 import 路径不变，不破坏现有 API。（类型属领域逻辑，放 `lib/` 才符合分层约定；`lib/` 不得反向依赖 `components/`。）

## 7. 接线与过场（`src/manager/App.tsx`、`styles.css`）

- App 新增 `dir` state（初值 `'next'`），与 `mode` 并存。
- 手势与点击**收敛到同一个 `switchMode`**，方向来源不同：

  ```
  switchMode(next: Mode, dir: Direction = directionBetween(mode, next))
    → setDir(dir) → setMode(next) → setDedupePreview(false)
  ```

  `Toolbar` 的 `onMode` 不传第二参（走线性方向）；手势回调传 `switchMode(cycleMode(mode, d), d)`（走循环，方向即手指方向）。
- `<main>` 的 className 由 `main view-switch` 扩为 `main view-switch dir-${dir}`；`key={mode}` 重挂载机制不变。`setDir` 与 `setMode` 同批次更新，className 与 key 同帧生效。
- 过场动画：现有单一 `viewIn`（纵向 5px 淡入）替换为两条方向性 keyframes，时长与曲线**沿用现状 `0.18s cubic-bezier(0.2, 0, 0, 1)`**：
  - `viewInNext`：`from { opacity: 0; transform: translateX(24px) }`（新视图从右侧滑入）
  - `viewInPrev`：`from { opacity: 0; transform: translateX(-24px) }`
- 首屏挂载时 `dir` 为 `'next'`，视觉上等价于现在的淡入，无需特判。
- `overscroll-behavior-x: none` 加在 `html` 上（根滚动容器），定位是**兜底**——主手段是 §5 的 `preventDefault()`，这条只覆盖 hook 尚未挂载的首帧。

## 8. 边界情况

- **拖拽中不切换**：判据是 hook 内部的**指针按下态**（`pointerdown` → `pointerup` / `pointercancel`），而非某个 `DndContext` 的拖拽 state。原因：管理页存在**两个**独立 `DndContext`（`App.tsx` 的窗口/域名列表、`SessionSection.tsx` 内部的会话卡片），后者的拖拽状态 App 完全看不见，用 `dragGhost !== null` 会漏掉唯一的跨会话拖拽场景。dnd-kit 拖拽必然是指针按下的子集，指针判据一刀覆盖两者及未来新增的任何一个，且 `components/` 与 `lib/` 无需改动。副作用是判据比「正在拖拽」更宽（按住鼠标选文字时也不响应），而真实的触控板双指横滑期间不可能有指针按下，对正常手势零影响。
- **去重预览残留**：`switchMode` 统一 `setDedupePreview(false)`。点击切换时鼠标离开按钮会自然触发 `mouseleave`，手势切换不经过鼠标，故需显式清理。
- **减弱动态效果**：`src/styles/tokens.css` 已全局压制 animation/transition 时长（`animation-duration: 0.01ms !important`），横向过场自动继承，本 spec 不额外处理。
- **横向滚动容器**：管理页当前无任何 `overflow-x: auto/scroll` 区域，无差别拦截横向 wheel 不会误伤任何滚动。若日后引入横向滚动区，本节需重新评估。
- **展开态与滚动位置**：`expandedKeys` 是 App 级共享 state，跨模式保留（现状不变）；`key={mode}` 重挂载导致主区滚动位置重置，与现有点击切换行为一致，不改。
- **会话重命名输入框聚焦时**：wheel 不影响文本输入，手势照常生效，不做特判。

## 9. 测试要点（TDD）

1. `lib/mode.test.ts` — `cycleMode` 三模式正反向遍历与首尾回绕（含 `window` 的 prev 为 `sessions`、`sessions` 的 next 为 `window`）；`directionBetween` 的**线性**取值：相邻、跨两格（`window → sessions` 必须是 `'next'`）、相同。
2. `lib/swipe.test.ts` — `isHorizontal` 在 ratio 边界两侧的取值；`feed` 喂事件序列断言返回值：单次大 `dx` 触发；多次小 `dx` 累积触发；触发后紧跟的惯性事件流**不再触发**；静止达解锁时长后可再次触发；纵向（`|dy|` 占优）与斜向不触发；方向反转清零后不误触；累积超时清零。
3. `hooks/useHorizontalSwipe.test.ts` — jsdom 派发 `WheelEvent`，配合 `vi.useFakeTimers()` 推进 `performance.now()`：
   - 横向命中 → 调回调，且 `defaultPrevented === true`；
   - **横向但未触发**（未达阈值 / 锁定态惯性事件）→ 不调回调，但 `defaultPrevented` 仍为 `true`（§5 的关键回归点）；
   - 纵向 → 不调回调、不 `preventDefault`；
   - `shiftKey` 或 `deltaMode !== 0` → 完全忽略，且不 `preventDefault`；
   - `pointerdown` 后不响应，`pointerup` 后恢复；
   - 重渲染不重置累积状态（detector 跨渲染持久）；卸载后移除监听。
4. `App.test.tsx` 增补 — 派发 `deltaX: 100` 的 wheel → 主区由窗口模式切到全部模式；另起一次渲染派发 `deltaX: -100` → 由窗口模式直达已保存会话（验证循环一步可达）；`deltaY` 滚动不切换；`shiftKey + deltaX` 不切换。**不写依赖秒级时间推进的连切用例**——锁定与解锁已由第 2、3 条覆盖。

## 10. 非目标

- 全程跟手（三视图并排 `translateX` 实时跟随、松手吸附）——需同时挂载三份列表与各自的 dnd 上下文，复杂度与性能代价不成比例。
- 键盘方向键切换、触摸屏 swipe、鼠标拖拽画布。
- 页点指示器等额外位置提示——控制条分段按钮的高亮态已标明当前模式。
- 手势灵敏度的用户可配置项（阈值写死在 `lib/swipe.ts`）。
- 「关闭手势」的设置项——误触可逆（反向滑回即可），不值得为此扩展 `Settings` 数据模型、设置页 UI 与 i18n 三处。
