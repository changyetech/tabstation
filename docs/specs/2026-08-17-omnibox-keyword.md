# 地址栏关键字：`ts` 搜索自有数据

- 日期：2026-08-17
- 状态：待实现
- 关联：与 [2026-08-17-newtab-override.md](2026-08-17-newtab-override.md) 并列但相互独立，可单独发版；收窄 [2026-08-15-tabstation-design.md](2026-08-15-tabstation-design.md) §2 非目标中「搜索功能」的表述范围（见 §2）。
- 术语：本文的**自有页面 / 管理页 / 稍后阅读 / 会话**均按 [CONTEXT.md](../../CONTEXT.md) 定义。

## 1. 目标

注册 `chrome.omnibox` 关键字 `ts`：在地址栏输入 `ts` 后按 `Tab` 或空格进入关键字模式，之后输入的文本用于搜索**扩展自己的数据**——已打开的标签页、稍后阅读条目、已保存会话——并直接执行跳转 / 打开 / 恢复。

它解决的是「几十个标签页里找那一个」：标签条上每个 tab 只剩一个 favicon 宽度时，肉眼扫描退化为随机点击；管理页能解决但需先打开管理页。关键字把这件事压缩为四次击键，不离开键盘、不新开任何页面。

新增权限：无（`omnibox` 是 manifest 顶级键，不是权限）。网络请求：无。

## 2. 与已否决「搜索功能」的边界

design spec §2 将「搜索功能」列为非目标，指的是**主区的 tab 过滤搜索框与历史搜索**——理由是它会把管理页变成一个查询界面，与「一眼看全、直接操作」的形态冲突。该否决继续有效。

本 spec 的关键字搜索在两点上与之不同，故不受该否决约束：

1. **不在管理页内**。它发生在地址栏，管理页的形态完全不变，没有任何 UI 新增。
2. **只搜自有数据，绝不搜网页**。无匹配时**不降级**到网页搜索（§6）——一旦降级，被否决的「网页搜索」就从后门回到了扩展里，扩展也就不再是单一用途的 tab 管理器。

## 3. 关键字与触发

`public/manifest.json` 增加：

```json
"omnibox": { "keyword": "ts" }
```

Chrome 在用户输入关键字并按 `Tab` 后，于地址栏左侧显示「搜索 <扩展名>」芯片，随后把输入逐字回调给扩展。

**已知限制**：omnibox 关键字是浏览器级全局命名空间，`ts` 简短，可能与用户已安装的其他扩展冲突；冲突时以 Chrome 的解析为准，扩展无法检测也无法申诉。接受此风险，不为此加可配置关键字（配置项本身无法解决冲突，只是把问题转嫁给用户）。

## 4. 匹配与排序（`src/lib/omnibox.ts`，纯函数）

```ts
export type OmniItem =
  | { kind: 'tab'; tabId: number; windowId: number; title: string; url: string }
  | { kind: 'read'; id: string; title: string; url: string }
  | { kind: 'session'; id: string; name: string; tabCount: number };

export interface OmniSource {
  tabs: chrome.tabs.Tab[];      // 已由调用方按 extBase 排除自有页面
  readLater: ReadLaterItem[];
  sessions: SavedSession[];
}

export function matchOmnibox(input: string, source: OmniSource): OmniItem[];
```

纯函数模块：不碰 `chrome.*`、不读时钟、不引 React。

| 项 | 规则 |
| --- | --- |
| 归一化 | 输入去首尾空白后转小写；空字符串直接返回空数组（仅显示默认建议） |
| 匹配字段 | 标签页与稍后阅读匹配 `title` 与 `url`；会话匹配 `name` |
| 匹配方式 | 子串包含，大小写不敏感。不做分词、不做模糊匹配、不做拼音 |
| 类内排序 | 标签页按 `lastAccessed` 降序；稍后阅读按 `savedAt` 降序；会话按 `createdAt` 降序 |
| 类内限额 | 每类最多 3 条 |
| 类间顺序 | 标签页 → 稍后阅读 → 会话。标签页优先是因为它对应最高频意图（跳到已开着的页面） |
| 总数上限 | 6 条 |

总数上限取 6 的理由：Chrome 实际展示的建议条数受地址栏空间限制、且不是有保证的契约。自行截断到一个稳妥值，避免依赖未定义行为，也避免让用户面对一屏无法一眼扫完的列表。

**自有页面排除**：调用方在传入前用 `chrome.runtime.getURL('')` 前缀过滤 `tabs`，与列表、计数、去重、会话快照使用同一判定基准（见 CONTEXT.md「自有页面」）。管理页与新标签页都不出现在结果里。

## 5. 建议渲染

### 5.1 单行富文本，不是多列

`chrome.omnibox` 的每条建议只有一个 `description` 字段，渲染为**一行富文本**，支持 `<match>`、`<dim>`、`<url>` 三个样式标记。没有独立的徽章列或次要行——类型标签只能作为该行文本的一部分。

格式：

```
<dim>标签页</dim> {高亮后的标题} <url>{hostname}</url>
<dim>稍后阅读</dim> {高亮后的标题} <url>{hostname}</url>
<dim>会话</dim> {高亮后的名称} <dim>{n} 个标签页</dim>
```

其中匹配到的子串用 `<match>` 包裹。

### 5.2 XML 转义（必做）

`description` 按 XML 解析，因此拼接前必须对**所有来自数据的文本**转义 `&`、`<`、`>`：

```ts
export function escapeXml(s: string): string;
```

tab 标题与 URL 是彻头彻尾的外部输入，任何一个含 `&` 的标题若未转义会导致整条建议渲染失败。转义必须发生在插入 `<match>` 标记**之前**，否则自己插入的标记也会被转掉。

### 5.3 默认建议

`chrome.omnibox.setDefaultSuggestion` 设置的第一条建议始终存在且始终排在首位，用于表明当前状态：

| 状态 | 文案 |
| --- | --- |
| 输入为空 | 搜索标签页、稍后阅读与会话 |
| 有输入且有结果 | 搜索「{输入}」 · 找到 {n} 项 |
| 有输入但无结果 | 没有匹配项 · 回车打开 Tab Station |

## 6. 执行语义（`onInputEntered`）

### 6.1 标识回传

每条建议的 `content` 字段编码为 `{kind}:{id}`（如 `tab:123`、`read:<uuid>`、`session:<uuid>`），由 `parseContent` 解析：

```ts
export function parseContent(content: string): { kind: OmniItem['kind']; id: string } | null;
```

`content` 在用户上下选择建议时会短暂显示在地址栏中，形如 `tab:123`。这是 omnibox API 的固有行为，视为可接受代价——它只在选择过程中出现，回车后即被导航结果取代。

解析失败（即用户直接回车执行了默认建议，`content` 为原始输入）→ 打开管理页，复用既有的 `safeOpenManager`。

### 6.2 各类行为

| 类型 | 行为 | `disposition` |
| --- | --- | --- |
| 标签页 | `chrome.windows.update(windowId, { focused: true })` + `chrome.tabs.update(tabId, { active: true })` | 忽略——目标 tab 已存在，"在新标签页打开"无意义 |
| 稍后阅读 | 打开并从清单移除（与管理页点击语义一致） | `currentTab` → 在当前 tab 导航；其余 → 新建 tab |
| 会话 | 恢复到新窗口，会话保留（模板式） | 忽略——恢复本就创建新窗口 |

三者与管理页内对应操作的语义严格一致。行为不一致会让同一个概念产生两套心智模型。

### 6.3 会话恢复逻辑需要抽取

恢复逻辑当前内联在 `src/manager/App.tsx` 的 `restoreSession` 中（创建窗口 + 还原 pinned）。service worker 需要完全相同的行为，故抽取为共用模块：

```ts
// src/lib/restore-session.ts
export async function restoreSession(session: SavedSession, mode: Settings['newWindowMode']): Promise<void>;
```

`App.tsx` 改为调用它。此模块有副作用（调用 `chrome.*`），与既有的 `src/lib/open-window.ts` 同级，符合现有分层。**不要在 background 里重写一份**——两份实现必然漂移。

## 7. service worker 约束

omnibox 事件在 MV3 service worker 中处理，SW 随时休眠，每次 `onInputChanged` 都可能是冷启动。因此：

- 每次回调**现场**读取 `chrome.tabs.query({})` 与 `chrome.storage.local`，**绝不缓存**上一次的结果或在模块作用域持有状态。
- 这与 `CLAUDE.md` 既有的「SW 不得持有内存状态，每次唤醒都从 storage 重读」约定一致，不是本 spec 的新约束。
- 逐字输入会带来逐字的 query，在 tab 数量级下成本可忽略；不做防抖——防抖需要定时器与跨事件状态，正是 SW 环境下最脆弱的东西。

## 8. background 职责边界变更

`src/background.ts` 当前的职责被定义为「唯一职责：图标点击 / 快捷键 → 管理页单例」，`CLAUDE.md` 与代码顶部注释均如此表述。挂载 omnibox 事件后，其职责扩大为**扩展的命令入口**（多了一类事件源）。

约束：

- 匹配、排序、建议构造、`content` 编解码全部在 `src/lib/omnibox.ts` 中以纯函数实现并单测；`background.ts` 只保留 `chrome.*` 事件监听与副作用调用这层胶水。
- 实现阶段必须同步更新 `CLAUDE.md` 中描述 background 职责的语句与 `background.ts` 顶部注释，否则文档立即漂移。

## 9. 边界情况

| 情况 | 行为 |
| --- | --- |
| 目标 tab 在执行前已被关闭 | `tabs.update` reject；沿用 `safeOpenManager` 的处理方式吞掉异常，不弹错——用户重新搜一次即可 |
| 目标窗口已关闭 | 同上 |
| 稍后阅读条目在执行前已被移除 | 照常打开 URL，移除操作对不存在的 id 是空操作 |
| 会话在执行前已被删除 | 无事发生，不报错 |
| 输入只有空白字符 | 等同空输入，仅显示默认建议 |
| 用户取消（`onInputCancelled`） | 无副作用，不需处理 |
| 无痕窗口 | 扩展默认在无痕中不启用，关键字不可用 |

## 10. 测试要点（TDD）

`src/lib/omnibox.ts` 为纯函数，全部可单测：

- `matchOmnibox`：空输入 → 空数组；大小写不敏感；标题与 URL 均可命中；会话按 name 命中；类内限额 3、总数上限 6；类间顺序为 tab → read → session；类内排序分别按 `lastAccessed` / `savedAt` / `createdAt` 降序。
- 自有页面排除：传入含管理页与新标签页 URL 的 tabs 时，结果不含它们。
- `escapeXml`：`&`、`<`、`>` 均被转义；含 `&` 的标题经完整建议构造后仍是合法 XML；`<match>` 标记未被自身转义。
- `parseContent`：三种合法 `content` 正确解析；原始用户输入（如 `mv3`）返回 `null`；畸形输入返回 `null` 不抛异常。
- `restore-session.ts`：抽取后行为与抽取前一致（迁移既有断言，确保不回归 pinned 还原与窗口尺寸策略）。

## 11. 非目标

- **降级到网页搜索**：无匹配时不做任何网页搜索，见 §2。
- **类型前缀过滤语法**：不做形如 `ts @read xxx` 的过滤器。三类混排 + 行内类型标签已足够，不为单一用途发明语法。
- **模糊匹配 / 拼音 / 分词**：子串匹配足以覆盖「我记得标题里有这个词」的场景；更聪明的匹配会带来更难解释的排序。
- **搜索浏览历史**：需 `history` 权限，且是 design spec §2 的既有非目标。
- **可配置关键字**：见 §3，配置无法解决关键字冲突。
- **建议中的删除操作**（`deletable`）：不支持在地址栏里删除稍后阅读条目或会话——破坏性操作应当发生在能看到上下文的管理页里。
