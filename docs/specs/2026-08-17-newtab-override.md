# 新标签页接管：⌘T 直接进入工作站

- 日期：2026-08-17
- 状态：待实现
- 关联：撤销 [2026-08-15-tabstation-design.md](2026-08-15-tabstation-design.md) §2 非目标中的「接管新标签页」；复用 [2026-08-16-manager-redesign.md](2026-08-16-manager-redesign.md) 定义的管理页界面，界面本身不做任何改动。
- 术语：本文的**自有页面 / 管理页 / 新标签页**均按 [CONTEXT.md](../../CONTEXT.md) 定义。

## 1. 目标

用 `chrome_url_overrides.newtab` 接管 Chrome 新标签页，令其渲染**与管理页完全相同的界面**——同一套 React 组件、同样的模式切换、拖拽、去重、稍后阅读与会话操作。

按 ⌘T 即进入工作站，不再需要「先看到摘要、再点一下进入」的中间步骤。

新增权限：无。网络请求：无。新 UI 代码：无。

## 2. 形态：一套界面，两个入口

### 2.1 为什么不能把 newtab 指向管理页 URL

最直觉的实现是让 `chrome_url_overrides.newtab` 直接指向 `src/manager/index.html`。**此方案必须否决**：那样每个新标签页都*是*管理页 tab，`findManagerTab`（`src/lib/singleton.ts`）会逐个匹配上，⌘⇧E 与扩展图标退化为「随机聚焦某个新标签页」，管理页单例（design spec §4.2）当场失效。

采用的方案是 **URL 路径分开、UI 组件共享**：

```
managerUrl = chrome-extension://<id>/src/manager/index.html
newTabUrl  = chrome-extension://<id>/src/newtab/index.html   ← 不以前者开头，天然不匹配
```

`src/lib/singleton.ts` 因此**一个字都不用改**。新入口的全部内容是：

```tsx
// src/newtab/main.tsx
import App from '../manager/App';
createRoot(document.getElementById('root')!).render(<App />);
```

### 2.2 两者的分工

| | 管理页 | 新标签页 |
| --- | --- | --- |
| 数量 | 按 `managerPageScope` 单例 | 不限，每按一次 ⌘T 就多一个 |
| 生命周期 | 常驻工作台，用户主动打开与关闭 | 临时，导航走或关掉即消失 |
| 入口 | 扩展图标 / ⌘⇧E | ⌘T |
| 界面 | 完全相同 | 完全相同 |
| 参与单例查找 | 是 | 否 |

「同一界面出现在两处」是刻意的：新标签页天生可以有很多个，而工作台需要唯一且可预期地被聚焦，二者是不同的**实体**，不是同一实体的两种打开方式。

### 2.3 多实例的正确性

三项本应担心的性质，现有实现已经满足，本 spec 仅作确认，不引入改动：

- **状态同步**：每个实例各自订阅 `chrome.storage.onChanged` 与 `chrome.tabs.*` 事件（`useStorageState` / `useTabs`），天然同步，无需跨实例通信。
- **拖拽 index**：`dragEndToMove`（`src/lib/dnd.ts`）使用 tab 对象上的**真实 `index`**，而非列表行序。故列表隐藏任意数量的 tab 都不影响 `chrome.tabs.move` 的正确性。
- **数据一致性**：所有写操作经 `chrome.storage` 或 `chrome.tabs` API，浏览器本身是唯一数据源，不存在实例本地状态。

## 3. 自有页面隐身（现状核对，零改动）

接管后新标签页的 URL 从 `chrome://newtab` 变为 `chrome-extension://<id>/src/newtab/index.html`。**现有隐身机制已自动覆盖它**：`src/manager/App.tsx` 传入的判定基准是扩展根前缀而非管理页 URL。

| 位置 | 作用 | 是否需改 |
| --- | --- | --- |
| `lib/grouping.ts` `visibleTabs` | 列表与计数 | 否 |
| `lib/dedupe.ts` `findDuplicateGroups` | 重复组统计 | 否 |
| `lib/storage.ts` `snapshotWindow` | 会话快照 | 否 |

选择扩展根前缀而非「枚举自有页面 URL」的理由：`chrome-extension://<id>/` **精确等于**「本扩展的全部页面」这一集合，不多不少——其他扩展的 id 不同不会被误伤，将来新增的自有页面自动覆盖。枚举式清单依赖维护者记得登记，漏登记的失效是静默的（页面悄悄进入会话快照，用户恢复会话时凭空多出一个扩展页），不会报错也不会让测试变红。

**唯一改动**：`App.tsx` 中该行注释的括号内容补上「新标签页」。

## 4. 关闭窗口语义变更（唯一的行为变更）

### 4.1 现状缺陷

`src/manager/App.tsx` 的 `closeWindow` 用**管理页精确 URL** 判定是否保留：

```ts
const containsManager = tabs.some((x) => x.windowId === win.id && x.url?.startsWith(mUrl));
```

于是在新标签页里点击自己所在窗口的「关闭窗口」，判定为 false，走整窗关闭——**连同用户正在操作的这个页面一起消失**；而同样的操作在管理页里执行，管理页会存活。`closeWindowAfterSave` 开启时的「保存会话并关闭窗口」走同一条路径，同样中招。

### 4.2 变更

判定基准改为扩展根前缀，与隐身共用同一个概念：

```ts
const containsOwnPage = tabs.some((x) => x.windowId === win.id && x.url?.startsWith(extBase));
```

规则表述为一句话：**自有页面不被关闭类操作波及**。含自有页面的窗口只关闭其余 tab（`chrome.tabs.remove(winVisible)`），不关闭窗口本身；其余窗口维持整窗关闭。

变更后 `mUrl` 再无其他用途，连同其定义一并删除。

### 4.3 取舍

被放弃的方案：用 `chrome.tabs.getCurrent()` 取得自身 tabId，**只**保留当前这一个页面，其余新标签页照常关闭。它行为更精确，但引入「当前页」这个与「自有页面」并列的第二概念，需要额外解释为什么同为新标签页的 A 保留而 B 被关；且 `getCurrent()` 是异步的，`closeWindow` 需改为异步或在挂载时预取。

采用方案的已知代价：同一窗口若开着多个新标签页，关闭该窗口后会剩下一个只含这些新标签页的窗口。此情形低频、无数据损失，且由用户自己造成，用户再关一次即可。判据是「一条无例外的规则优于一条更精确但需要解释的规则」。

## 5. 构建与 manifest

### 5.1 新增入口

```
src/newtab/
├── index.html     # 与 manager/index.html 同构，挂载点 #root
└── main.tsx       # import 管理页 App 并渲染
```

路径常量与管理页并列定义，`vite.config.ts` 的 `rollupOptions.input` 增加 `newtab: NEWTAB_PATH` 一项，沿用既有的 import 常量方式，避免路径二次书写。

承载这些常量的 `src/lib/manager-url.ts` **重命名为 `src/lib/urls.ts`**：它自此定义的是「扩展自身的全部页面 URL」（`MANAGER_PATH`、`NEWTAB_PATH`、`managerUrl()`、`ownPagePrefix()`），旧文件名会让 `NEWTAB_PATH` 名实不副。`ownPagePrefix()` 收口 `chrome.runtime.getURL('')` 这个自有页面判定基准，使其与页面路径同处一个单一来源。

### 5.2 manifest

`public/manifest.json` 增加：

```json
"chrome_url_overrides": { "newtab": "src/newtab/index.html" }
```

`chrome_url_overrides` 是 manifest 顶级键，**不是权限**：不进 `permissions` 数组，安装时不产生权限警告。Chrome 会在首次生效时向用户展示「扩展更改了新标签页」提示，由用户选择保留或恢复——这是浏览器行为，不在扩展的控制范围内。

## 6. 边界情况

| 情况 | 行为 |
| --- | --- |
| 无痕窗口 | 扩展默认在无痕中不启用，接管不生效，无痕新标签页保持原生。与 design spec §2「无痕模式」非目标一致。 |
| 同窗口多个新标签页 | 全部隐身；关闭该窗口时全部保留（§4.3）。 |
| 在新标签页里保存自己所在窗口的会话 | `snapshotWindow` 已排除自有页面，快照不含任何新标签页；恢复时不会凭空多出扩展页。 |
| 在新标签页里执行一键去重 | 自有页面不进入重复组统计，多个新标签页不会被判为重复。 |
| 用户从新标签页导航到别处 | 该 tab 变为普通 tab，正常进入列表与计数。 |
| 恢复浏览器会话 / 恢复已关闭的标签页 | 被恢复的新标签页仍是新标签页，行为一致。 |

## 7. 性能约束

这是本变更**唯一的真实代价**：每次 ⌘T 都要完整挂载 React 与 dnd-kit 并渲染全部区块，而用户对 ⌘T 的响应延迟极其敏感。

- 既有的**展示条数**折叠（`visibleTabs` 设置，默认 12）已限制首屏行数，是主要的缓解手段。
- 实现完成后必须实测 ⌘T 到首屏可见的耗时，并在多窗口、上百 tab 的场景下复测。
- 若实测不可接受，**先优化渲染路径**（例如延迟挂载非首屏区块），不得以「加一个开关让用户关掉内容」作为应对——那等于承认默认形态是错的。

## 8. 测试要点（TDD）

- `findManagerTab`：tabs 中含新标签页 URL 时**不得**返回它（护栏测试）。此约束目前靠 `src/newtab/…` 恰好不以 `src/manager/index.html` 开头而成立，属路径字符串的巧合而非显式约束，必须由测试固化——否则将来有人把路径调整为 `src/manager/newtab/` 会静默摧毁单例。
- `visibleTabs` / `findDuplicateGroups` / `snapshotWindow`：传入含新标签页 URL 的 tab 集合时，结果不含它（回归测试，覆盖零改动的假设本身）。
- `closeWindow`：
  - 窗口含新标签页 → 只调用 `chrome.tabs.remove` 且参数不含任何自有页面 tab id，不调用 `chrome.windows.remove`；
  - 窗口含管理页 → 行为同上（不回归）；
  - 窗口不含任何自有页面 → 整窗关闭。
- 新标签页入口渲染：`src/newtab/main.tsx` 挂载后出现管理页的标志性元素（沿用 `manager/main.test.tsx` 的既有断言方式）。

## 9. 非目标

- **页内搜索框**：⌘T 后光标已在地址栏，页内搜索框与之功能重复；且它会把「网页搜索」这个与 tab 管理无关的第二用途引入扩展。搜索自有数据的诉求由 [2026-08-17-omnibox-keyword.md](2026-08-17-omnibox-keyword.md) 承担。
- **新标签页专用的简化界面**：两套界面即两份维护成本与两处会漂移的行为。要么完整复用，要么不做。
- **「是否接管」开关**：技术上不可实现——扩展无法将用户导航回真正的原生新标签页，`chrome://newtab` 会被重新拦回自身。用户如需恢复只能禁用扩展。
- **常用站点宫格 / 内嵌历史面板**：分别需要 `topSites` 与 `history` 权限，后者本就是 design spec §2 的非目标。
- **设置项**：本变更不新增任何 `Settings` 字段，设置页零改动。

## 10. 发布前置

接管新标签页对用户不可逆（只能通过禁用扩展恢复），且 Chrome Web Store 对更改浏览器设置的扩展要求明示披露。发版前必须完成：

1. 商店描述中显式声明扩展会接管新标签页，并说明其内容即 tab 管理界面——接管须被叙述为「tab 管理」这一单一用途的延伸，而非独立的第二功能。
2. `README.md` 首屏功能说明中同样声明。

同时实现阶段需更新 `CLAUDE.md` 的 Repository Structure 目录树，加入 `src/newtab/`。
