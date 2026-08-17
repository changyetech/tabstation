# 新标签页接管 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 `chrome_url_overrides.newtab` 接管 Chrome 新标签页，令其渲染与管理页**完全相同**的界面。按 ⌘T 即进入工作站。零新增权限、零新增 UI 代码。

**Architecture:** 新增第四个构建入口 `src/newtab/`，其 `main.tsx` 直接 import 管理页的 `App` 组件渲染——UI 代码零重复。关键约束是 **URL 路径分开、UI 组件共享**：`chrome_url_overrides` 指向 `src/newtab/index.html` 而非管理页 URL，`findManagerTab` 因而天然不匹配，管理页单例逻辑零改动。`src/lib/manager-url.ts` 重命名为 `src/lib/urls.ts`，收口扩展自身的全部页面 URL 与自有页面判定基准 `ownPagePrefix()`。既有的隐身机制已基于扩展根前缀，对新标签页自动生效；唯一需要变更的行为是关闭窗口的判定基准。

**Tech Stack:** React 18 + TypeScript (strict) + Vite + Vitest / jsdom / Testing Library，包管理 pnpm。

**Spec:** [docs/specs/2026-08-17-newtab-override.md](../specs/2026-08-17-newtab-override.md)（本计划全部条款的来源；下文以 §N 引用）

**与关键字计划的关系:** 无技术依赖。建议排在 [2026-08-17-omnibox-keyword.md](2026-08-17-omnibox-keyword.md) 之后发版——后者无侵入、无审核风险，适合先发。

## Global Constraints

- **绝不**把 `chrome_url_overrides.newtab` 指向 `src/manager/index.html`（§2.1）。那会让每个新标签页都是管理页 tab，`findManagerTab` 逐个匹配上，管理页单例当场失效。
- **不做新标签页专用的简化界面**（§9）。新入口只允许 import 管理页 `App`，不得复制或分叉组件。
- `src/lib/singleton.ts` 的 `startsWith(managerUrl)` **必须保持精确匹配管理页**，绝不能改成 `ownPagePrefix()`——它与隐身的前缀判定形似而语义相反（§8）。
- 本计划不新增任何 `Settings` 字段，设置页零改动（§9）。
- 不新增任何权限。`chrome_url_overrides` 是 manifest 顶级键，不进 `permissions`（§5.2）。
- 注释一律简体中文。测试文件与被测文件同目录同名 `.test.ts` / `.test.tsx`。
- 每个任务结尾必须 `make check` 通过（fmt-check + lint + typecheck + test）后再提交。

---

## 前置阅读（实现者背景）

这是一个 Chrome MV3 扩展。你需要知道的五件事：

1. **没有 dev server**。逻辑验证走 Vitest（`pnpm vitest run <file>`）；改 manifest 或新增入口后必须 `pnpm build` 并在 `chrome://extensions` 点扩展的 ↻ 才生效。
2. **`chrome.*` 在测试里是 mock 的**：`getChromeMock()` 取 `{ chromeMock, storageData }`，mock 的扩展 id 是 `test-id`，故 `chrome.runtime.getURL('')` 返回 `chrome-extension://test-id/`。
3. **`src/manager/App.test.tsx` 已有 `seedTwoWindows()` 与 `winBlockOf()` 辅助函数**，关闭窗口的既有用例就建立在它们之上，新用例照此模式写。
4. **App 级测试断言中文文案**（`navigator.language` 在 setup 里钉死为 `zh-CN`）。
5. **`public/` 不是可加载的扩展目录**，只有 `dist/` 是——`manifest.json` 的 `version` 由构建期插件注入。

单文件测试命令：`pnpm vitest run src/lib/singleton.test.ts`
全量校验：`make check`

## File Structure

| 文件 | 状态 | 职责 |
| --- | --- | --- |
| `src/lib/urls.ts` | 重命名自 `manager-url.ts` | `MANAGER_PATH`、`NEWTAB_PATH`、`managerUrl()`、`ownPagePrefix()` |
| `src/lib/singleton.test.ts` | 修改 | 新增护栏用例：`findManagerTab` 不得返回新标签页 |
| `src/lib/grouping.test.ts` | 修改 | 新增回归用例：新标签页不出现在 `visibleTabs` |
| `src/lib/dedupe.test.ts` | 修改 | 新增回归用例：新标签页不进入重复组 |
| `src/lib/storage.test.ts` | 修改 | 新增回归用例：新标签页不进入会话快照 |
| `src/manager/App.tsx` | 修改 | `closeWindow` 判定基准改为 `ownPagePrefix()`；删除 `mUrl`；隐身注释补「新标签页」 |
| `src/manager/App.test.tsx` | 修改 | 新增关闭窗口用例：窗口含新标签页时窗口存活 |
| `src/newtab/index.html` | 新建 | 挂载点，与 `manager/index.html` 同构 |
| `src/newtab/main.tsx` | 新建 | import 管理页 `App` 并渲染 |
| `src/newtab/main.test.tsx` | 新建 | 挂载测试，照 `manager/main.test.tsx` |
| `vite.config.ts` | 修改 | `rollupOptions.input` 增加 `newtab` |
| `public/manifest.json` | 修改 | 增加 `chrome_url_overrides` |
| `CLAUDE.md` | 修改 | 目录树加 `src/newtab/`；`manager-url.ts` 的引用改为 `urls.ts` |
| `README.md` | 修改 | 首屏声明扩展会接管新标签页 |

---

### Task 1: URL 模块收口与护栏测试

先把「自有页面」这个概念在代码里落成单一来源，并用测试固化单例不误匹配。本任务**不引入接管**，完成后扩展行为不变。

**Files:**

- Rename: `src/lib/manager-url.ts` → `src/lib/urls.ts`
- Modify: `vite.config.ts`、`src/background.ts`、`src/manager/App.tsx`（import 路径）
- Test: `src/lib/singleton.test.ts`、`src/lib/grouping.test.ts`、`src/lib/dedupe.test.ts`、`src/lib/storage.test.ts`

**Interfaces:**

- Produces:

```ts
export const MANAGER_PATH = 'src/manager/index.html';
export const NEWTAB_PATH = 'src/newtab/index.html';
export function managerUrl(): string; // 既有，签名不变
export function ownPagePrefix(): string; // = chrome.runtime.getURL('')
```

- [ ] **Step 1: 写失败测试**

护栏用例（`src/lib/singleton.test.ts`）——这是本计划最重要的一条测试，它固化的约束目前仅靠路径字符串的巧合成立（§8）：

```ts
it('新标签页不得被当成管理页（单例护栏）', () => {
  const managerUrl = 'chrome-extension://test-id/src/manager/index.html';
  const newTab = makeTab({ id: 5, url: 'chrome-extension://test-id/src/newtab/index.html' });
  expect(findManagerTab([newTab], managerUrl, 'global', 1)).toBeUndefined();
});
```

三条隐身回归用例，覆盖「零改动」这个假设本身（§3）——它们现在就应该通过，作用是把假设钉住：

```ts
// grouping.test.ts
it('新标签页不出现在可见列表中', () => {
  const tabs = [
    makeTab({ id: 1, url: 'https://a.com/' }),
    makeTab({ id: 2, url: 'chrome-extension://test-id/src/newtab/index.html' }),
  ];
  expect(visibleTabs(tabs, 'chrome-extension://test-id/').map((t) => t.id)).toEqual([1]);
});

// dedupe.test.ts：两个新标签页不得被判为重复组
// storage.test.ts：snapshotWindow 结果不含新标签页 URL
```

- [ ] **Step 2: 跑测试确认失败**

`pnpm vitest run src/lib/singleton.test.ts` —— 护栏用例此时应因 `NEWTAB_PATH` 尚未定义或断言未加而失败；三条回归用例可能一开始就通过，这是预期的（它们是钉子，不是驱动）。

- [ ] **Step 3: 重命名模块并补齐导出**

`git mv src/lib/manager-url.ts src/lib/urls.ts`，加 `NEWTAB_PATH` 与 `ownPagePrefix()`，改三处 import（`vite.config.ts`、`src/background.ts`、`src/manager/App.tsx`）。

> 重命名的理由是不歧义：该模块自此定义的是扩展自身的全部页面 URL，`manager-url.ts` 会让 `NEWTAB_PATH` 名实不副（§5.1）。`vite.config.ts` 直接 import 该模块，改名后必须同步，否则构建立刻报错——不会静默。

- [ ] **Step 4: 跑测试确认通过**

- [ ] **Step 5: 全量校验并提交**

---

### Task 2: 关闭窗口语义变更

本计划**唯一**改变用户可见行为的任务（§4）。

**Files:**

- Modify: `src/manager/App.tsx`
- Test: `src/manager/App.test.tsx`

**Interfaces:** 无新增导出。`closeWindow` 内部判定由 `mUrl` 改为 `ownPagePrefix()`。

- [ ] **Step 1: 写失败测试**

照既有 `关闭窗口·窗口含管理页` 用例的模式，新增一条：

```ts
it('关闭窗口·窗口含新标签页：只关其余 tab，窗口存活', async () => {
  const { chromeMock } = getChromeMock();
  seedTwoWindows();
  // 让窗口 2 含一个新标签页（窗口 2 原本不含任何自有页面，会整窗关闭）
  // 具体 seed 方式沿用 seedTwoWindows 的既有写法，追加：
  //   makeTab({ id: 99, windowId: 2, url: 'chrome-extension://test-id/src/newtab/index.html' })
  render(<App />);
  await waitFor(() => expect(screen.getByText('窗口 2')).toBeInTheDocument());
  await userEvent.click(within(winBlockOf('窗口 2')).getByTitle('关闭窗口'));
  await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalled());
  expect(chromeMock.windows.remove).not.toHaveBeenCalled();
});
```

同时确认既有两条用例（含管理页 → 窗口存活、不含自有页面 → 整窗关闭）**不回归**。

- [ ] **Step 2: 跑测试确认失败**

`pnpm vitest run src/manager/App.test.tsx`

- [ ] **Step 3: 改判定基准**

```ts
const containsOwnPage = tabs.some((x) => x.windowId === win.id && x.url?.startsWith(extBase));
```

`mUrl` 至此再无其他用途，连同 `const mUrl = managerUrl();` 一并删除；`managerUrl` 的 import 若因此变为未使用也一并移除。

> 规则表述：**自有页面不被关闭类操作波及**。含自有页面的窗口只关其余 tab，不关窗口本身。`closeWindowAfterSave` 的「保存并关闭」走同一条路径，自动获得同样的保护。

- [ ] **Step 4: 跑测试确认通过**

- [ ] **Step 5: 全量校验并提交**

---

### Task 3: 新标签页入口与构建接线

**Files:**

- Create: `src/newtab/index.html`、`src/newtab/main.tsx`
- Test: `src/newtab/main.test.tsx`
- Modify: `vite.config.ts`、`public/manifest.json`

**Interfaces:**

- Consumes: `App`（`src/manager/App.tsx`）、`NEWTAB_PATH`（`src/lib/urls.ts`）。
- Produces: 无导出（入口模块）。

- [ ] **Step 1: 写失败测试**

照 `src/manager/main.test.tsx` 的两条用例（`#root` 缺失时抛明确错误 / 存在时正常挂载）写 `src/newtab/main.test.tsx`。

- [ ] **Step 2: 跑测试确认失败**

- [ ] **Step 3: 建入口**

`src/newtab/index.html` 与 `manager/index.html` 同构，仅改 `<title>` 与 script 路径。`src/newtab/main.tsx` 全部内容：

```tsx
import { createRoot } from 'react-dom/client';
import App from '../manager/App';

// 新标签页与管理页共享同一套界面（spec §2）：只分 URL，不分组件
const root = document.getElementById('root');
if (!root) throw new Error('#root 不存在');
createRoot(root).render(<App />);
```

> 挂载与报错方式必须与 `manager/main.tsx` 一致（含 `#root` 缺失时抛错而非静默白屏），两个入口的失败模式不应有差异。

- [ ] **Step 4: 构建接线**

`vite.config.ts` 的 `rollupOptions.input` 增加 `newtab: NEWTAB_PATH`（import 常量，不写字面量路径）。

`public/manifest.json` 增加：

```json
"chrome_url_overrides": { "newtab": "src/newtab/index.html" }
```

- [ ] **Step 5: 跑测试确认通过，并验证构建产物**

`pnpm build` 后确认 `dist/src/newtab/index.html` 存在、`dist/manifest.json` 含 `chrome_url_overrides`。

- [ ] **Step 6: 全量校验并提交**

---

### Task 4: 文档同步与发布披露

接管对用户不可逆（只能通过禁用扩展恢复），Chrome Web Store 对更改浏览器设置的扩展要求明示披露（§10）。**本任务未完成不得发版。**

**Files:**

- Modify: `CLAUDE.md`、`README.md`、`src/manager/App.tsx`（注释）

- [ ] **Step 1: 代码注释**

`App.tsx` 中隐身范围那句注释的括号内容补上「新标签页」，使其与实际覆盖范围一致（§3）。

- [ ] **Step 2: `CLAUDE.md`**

- Repository Structure 目录树加 `src/newtab/` 条目。
- 「管理页路径唯一定义在 `src/lib/manager-url.ts`」一句改为 `src/lib/urls.ts`，并说明该模块同时定义新标签页路径与自有页面前缀。

- [ ] **Step 3: `README.md` 与商店描述**

README 首屏功能说明中显式声明扩展会接管新标签页，并说明其内容即 tab 管理界面。商店描述同样声明——**接管须被叙述为「tab 管理」这一单一用途的延伸**，而非独立的第二功能。

- [ ] **Step 4: 全量校验并提交**

---

## 手动验收（浏览器）

`pnpm build` 后在 `chrome://extensions` 重新加载扩展（改了 manifest，必须点 ↻）：

1. 按 ⌘T：出现完整的管理界面——Hero 统计、控制条三个模式、窗口区块、稍后阅读侧栏，与管理页无差别。
2. 该新标签页**不出现在**任何窗口区块的列表里，窗口计数不含它。
3. 连按三次 ⌘T 开出三个新标签页：三个都不出现在列表中，也不被判为重复组。
4. 按 ⌘⇧E：聚焦或新建**管理页**（一个独立的 tab），不是聚焦某个新标签页。反复按只在同一个管理页上跳转，不会越开越多。
5. 在新标签页里点自己所在窗口的「关闭窗口」：其余 tab 被关，**窗口与该新标签页存活**。
6. 在新标签页里保存该窗口的会话，再恢复：恢复出的窗口不含任何扩展页面。
7. 在新标签页里拖拽调整某个 tab 的顺序：真实浏览器标签条顺序同步正确（验证隐藏 tab 不影响 index 计算）。
8. 从新标签页导航到任意网站：该 tab 变为普通 tab，正常进入列表与计数。
9. **性能实测（§7）**：在多窗口、上百 tab 的场景下按 ⌘T，记录到首屏可见的耗时。若明显迟滞，先优化渲染路径（例如延迟挂载非首屏区块），**不得**以「加开关让用户关掉内容」作为应对。

## Self-Review

**Spec 覆盖对照：**

| Spec 章节 | 落到 |
| --- | --- |
| §2.1 不得指向管理页 URL / 路径分开 | Global Constraints 第 1 条；Task 1 Step 1 护栏测试；手动验收 4 |
| §2.2 两者分工 | Task 3 Step 3（共享 App）；手动验收 3、4 |
| §2.3 多实例正确性（状态同步 / 拖拽 index / 数据一致） | 无代码改动，由手动验收 3、7 覆盖 |
| §3 自有页面隐身（零改动 + 注释更新） | Task 1 Step 1 三条回归用例；Task 4 Step 1 |
| §4 关闭窗口语义变更 | Task 2 全部；手动验收 5 |
| §5.1 构建入口与模块重命名 | Task 1 Step 3；Task 3 Step 4 |
| §5.2 manifest | Task 3 Step 4 |
| §6 边界情况 | 无痕由 Chrome 行为保证（不实现）；同窗口多新标签页 → 手动验收 3、5；会话快照 → Task 1 回归用例 + 手动验收 6；去重 → 手动验收 3；导航走 → 手动验收 8 |
| §7 性能约束 | 手动验收 9（含「不得加开关搪塞」的约束） |
| §8 测试要点 | Task 1 Step 1（护栏 + 三条回归）、Task 2 Step 1（三种关闭场景）、Task 3 Step 1（入口挂载） |
| §9 非目标 | 计划内无对应实现，Global Constraints 已声明不做 |
| §10 发布前置 | Task 4 全部 |

**类型一致性核对：** `NEWTAB_PATH` 仅在 `lib/urls.ts` 定义，`vite.config.ts` 与测试均从该处 import，不写字面量路径；`ownPagePrefix()` 是自有页面判定的唯一来源，`App.tsx` 的隐身与关闭窗口共用它。`App` 组件的默认导出被 `manager/main.tsx` 与 `newtab/main.tsx` 共同消费，签名无参，两处一致。

**已知风险：**

1. **⌘T 首屏渲染耗时**是本计划唯一无法在 Vitest 中证伪的风险（手动验收 9）。完整挂载 React + dnd-kit 并渲染全部区块，而用户对 ⌘T 延迟极其敏感。既有的展示条数折叠（默认 12）是主要缓解手段，但必须实测。
2. **Task 1 的三条隐身回归用例可能一开始就通过**，这不代表任务无意义——它们钉住的是「零改动」这个假设，防止将来有人把判定基准改回管理页精确 URL 而无人察觉。
3. **接管不可逆**，一旦发版，用户只能通过禁用扩展恢复原生新标签页。Task 4 的披露是发版硬前置。
