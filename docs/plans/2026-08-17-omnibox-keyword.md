# 地址栏关键字 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 注册 `chrome.omnibox` 关键字 `ts`，在地址栏搜索扩展自己的数据（已打开标签页 / 稍后阅读 / 已保存会话）并直接执行跳转、打开、恢复。不搜网页，不新增权限。

**Architecture:** 两层。纯逻辑层新增 `src/lib/omnibox.ts`：匹配排序（`matchOmnibox`）、XML 转义（`escapeXml`）、建议构造（`buildSuggestion`）、标识编解码（`toContent` / `parseContent`），不碰 `chrome.*`、不读时钟。副作用层在 `src/background.ts` 挂 omnibox 四个事件，每次回调现场读 `chrome.tabs.query` 与 `chrome.storage.local`，把数据喂给纯函数、把结果交给 `chrome.omnibox.suggest`。会话恢复逻辑从 `manager/App.tsx` 抽到 `src/lib/restore-session.ts` 供两处共用。

**Tech Stack:** TypeScript (strict) + Vitest / jsdom + 手写 `chrome.*` mock，包管理 pnpm。

**Spec:** [docs/specs/2026-08-17-omnibox-keyword.md](../specs/2026-08-17-omnibox-keyword.md)（本计划全部条款的来源；下文以 §N 引用）

**与新标签页计划的关系:** 无技术依赖，可先于 [2026-08-17-newtab-override.md](2026-08-17-newtab-override.md) 单独实现与发版。建议先发本计划——它无侵入、无审核风险，可用来验证「搜自有数据」是否高频。

## Global Constraints

- 关键字固定为 `ts`，不做可配置项（§3）。
- `src/lib/omnibox.ts` 是纯函数层：不引 React、不碰 DOM、不调用 `chrome.*`、不读时钟。数据由调用方传入。
- **绝不缓存**：service worker 随时休眠，每次事件回调现场重读数据，不在模块作用域持有任何状态（§7）。
- 无匹配时**不降级到网页搜索**（§2、§11）——这是本功能与已否决「搜索功能」的边界，破坏它等于把网页搜索从后门放回扩展。
- 匹配限额写死：每类最多 3 条、总数最多 6 条（§4）。
- 注释一律简体中文。测试文件与被测文件同目录同名 `.test.ts`。
- 现有对外 API 不得破坏：`openManager` / `safeOpenManager` 的导出与签名保持不变。
- 每个任务结尾必须 `make check` 通过（fmt-check + lint + typecheck + test）后再提交。

---

## 前置阅读（实现者背景）

这是一个 Chrome MV3 扩展。你需要知道的四件事：

1. **没有 dev server**。逻辑验证全部走 Vitest（`pnpm vitest run <file>`），不要试图起浏览器。
2. **`chrome.*` 在测试里是 mock 的**：`src/test/chrome-mock.ts` 由 `src/test/setup.ts` 在模块级安装并每例重置，用 `getChromeMock()` 取 `{ chromeMock, storageData }`。mock 的扩展 id 是 `test-id`，故 `chrome.runtime.getURL('')` 返回 `chrome-extension://test-id/`。
3. **mock 目前没有 `omnibox`**，Task 3 需要先补上（含四个 `MockEvent`）。
4. **service worker 不得持有内存状态**，这是仓库既有约定（`CLAUDE.md`），本功能必须遵守。

单文件测试命令：`pnpm vitest run src/lib/omnibox.test.ts`
全量校验：`make check`

## File Structure

| 文件 | 状态 | 职责 |
| --- | --- | --- |
| `src/lib/omnibox.ts` | 新建 | `OmniItem` 类型、`matchOmnibox`、`escapeXml`、`buildSuggestion`、`toContent`、`parseContent`、`defaultDescription` |
| `src/lib/omnibox.test.ts` | 新建 | 上述纯函数单测 |
| `src/lib/restore-session.ts` | 新建 | 从 `App.tsx` 抽出的会话恢复（创建窗口 + 还原 pinned） |
| `src/lib/restore-session.test.ts` | 新建 | 恢复行为单测（迁移自 App 层断言，确保不回归） |
| `src/manager/App.tsx` | 修改 | `restoreSession` 改为调用 lib 模块 |
| `src/test/chrome-mock.ts` | 修改 | 补 `omnibox`（`setDefaultSuggestion` + 四个事件） |
| `src/background.ts` | 修改 | 挂 omnibox 事件；顶部职责注释更新 |
| `src/background.test.ts` | 修改 | omnibox 行为测试 |
| `public/manifest.json` | 修改 | 增加 `"omnibox": { "keyword": "ts" }` |
| `src/i18n/zh_CN.json` / `en.json` | 修改 | 默认建议与类型标签文案 |
| `CLAUDE.md` | 修改 | background 职责描述由「唯一职责：管理页单例」改为「扩展的命令入口」 |

---

### Task 1: 匹配与建议构造（`src/lib/omnibox.ts`）

**Files:**

- Create: `src/lib/omnibox.ts`
- Test: `src/lib/omnibox.test.ts`

**Interfaces:**

- Produces:

```ts
export type OmniItem =
  | { kind: 'tab'; tabId: number; windowId: number; title: string; url: string }
  | { kind: 'read'; id: string; title: string; url: string }
  | { kind: 'session'; id: string; name: string; tabCount: number };

export interface OmniSource {
  tabs: chrome.tabs.Tab[]; // 调用方已按 ownPagePrefix 排除自有页面
  readLater: ReadLaterItem[];
  sessions: SavedSession[];
}

export function matchOmnibox(input: string, source: OmniSource): OmniItem[];
export function escapeXml(s: string): string;
export function buildSuggestion(item: OmniItem, query: string): chrome.omnibox.SuggestResult;
export function toContent(item: OmniItem): string;
export function parseContent(content: string): { kind: OmniItem['kind']; id: string } | null;
export function defaultDescription(input: string, count: number): string;
```

- Consumes: `ReadLaterItem` / `SavedSession`（`src/lib/storage.ts`）、`hostnameOf`（`src/lib/grouping.ts`）。

- [ ] **Step 1: 写失败测试**

覆盖 §4 的每一条规则与 §5.2 的转义要求：

```ts
import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import {
  buildSuggestion,
  escapeXml,
  matchOmnibox,
  parseContent,
  toContent,
  type OmniSource,
} from './omnibox';

const emptySource: OmniSource = { tabs: [], readLater: [], sessions: [] };

describe('matchOmnibox', () => {
  it('空输入与纯空白输入返回空数组', () => {
    const source = { ...emptySource, tabs: [makeTab({ title: 'MV3 指南' })] };
    expect(matchOmnibox('', source)).toEqual([]);
    expect(matchOmnibox('   ', source)).toEqual([]);
  });

  it('标题与 URL 均可命中，且大小写不敏感', () => {
    const source: OmniSource = {
      ...emptySource,
      tabs: [
        makeTab({ id: 1, title: 'MV3 迁移指南', url: 'https://developer.chrome.com/a' }),
        makeTab({ id: 2, title: '无关', url: 'https://example.com/mv3-notes' }),
      ],
    };
    expect(matchOmnibox('mv3', source).map((x) => x.kind === 'tab' && x.tabId)).toEqual([1, 2]);
  });

  it('类间顺序恒为 tab → read → session', () => {
    const source: OmniSource = {
      tabs: [makeTab({ id: 1, title: 'x 标签' })],
      readLater: [{ id: 'r1', url: 'https://a.com/', title: 'x 待读', savedAt: 1 }],
      sessions: [{ id: 's1', name: 'x 会话', createdAt: 1, tabs: [] }],
    };
    expect(matchOmnibox('x', source).map((i) => i.kind)).toEqual(['tab', 'read', 'session']);
  });

  it('类内限额 3、总数上限 6', () => {
    const many = (n: number, p: string) =>
      Array.from({ length: n }, (_, i) => makeTab({ id: i + 1, title: `${p}${i}` }));
    const source: OmniSource = {
      tabs: many(5, 'x'),
      readLater: Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        url: 'https://a.com/',
        title: `x${i}`,
        savedAt: i,
      })),
      sessions: Array.from({ length: 5 }, (_, i) => ({
        id: `s${i}`,
        name: `x${i}`,
        createdAt: i,
        tabs: [],
      })),
    };
    const out = matchOmnibox('x', source);
    expect(out).toHaveLength(6);
    expect(out.filter((i) => i.kind === 'tab')).toHaveLength(3);
  });

  it('类内排序：tab 按 lastAccessed 降序', () => {
    const source: OmniSource = {
      ...emptySource,
      tabs: [
        makeTab({ id: 1, title: 'x 旧', lastAccessed: 100 }),
        makeTab({ id: 2, title: 'x 新', lastAccessed: 900 }),
      ],
    };
    expect(matchOmnibox('x', source).map((i) => i.kind === 'tab' && i.tabId)).toEqual([2, 1]);
  });
});

describe('escapeXml 与 buildSuggestion', () => {
  it('转义 & < >', () => {
    expect(escapeXml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('含 & 的标题构造出的 description 仍是合法 XML，且 match 标记未被自身转义', () => {
    const item: OmniItem = {
      kind: 'tab',
      tabId: 1,
      windowId: 1,
      title: 'Rust & Wasm 指南',
      url: 'https://example.com/a',
    };
    const { description } = buildSuggestion(item, 'wasm');
    expect(description).toContain('&amp;');
    expect(description).toContain('<match>');
    expect(() => new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml')).not.toThrow();
    expect(
      new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml').querySelector('parsererror'),
    ).toBeNull();
  });
});

describe('toContent / parseContent', () => {
  it('三类标识可往返', () => {
    const item: OmniItem = { kind: 'read', id: 'r1', title: 't', url: 'https://a.com/' };
    expect(parseContent(toContent(item))).toEqual({ kind: 'read', id: 'r1' });
  });

  it('原始用户输入与畸形输入返回 null 而不抛异常', () => {
    expect(parseContent('mv3')).toBeNull();
    expect(parseContent('')).toBeNull();
    expect(parseContent('bogus:1')).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

`pnpm vitest run src/lib/omnibox.test.ts`

- [ ] **Step 3: 写最小实现**

要点：

- `matchOmnibox` 先归一化输入（trim + toLowerCase），空则直接返回 `[]`；三类各自过滤 → 各自排序 → 各取前 3 → 按 tab/read/session 拼接 → `slice(0, 6)`。
- `escapeXml` 只处理 `&`、`<`、`>`（`&` 必须最先替换，否则会把自己产生的实体再转一次）。
- `buildSuggestion` 顺序固定：**先转义、后插 `<match>` 标记**。类型标签用 `<dim>`，hostname 用 `<url>`。会话行尾用 `<dim>{n} 个标签页</dim>`。
- `toContent` 输出 `${kind}:${id}`（tab 用 `tabId`）；`parseContent` 只接受三个已知 kind，其余返回 `null`。
- `defaultDescription` 按 §5.3 三种状态出文案。

- [ ] **Step 4: 跑测试确认通过**

- [ ] **Step 5: 全量校验并提交**

`make check` 通过后提交。

---

### Task 2: 抽取会话恢复（`src/lib/restore-session.ts`）

会话恢复当前内联在 `src/manager/App.tsx` 的 `restoreSession` 中。background 需要**完全相同**的行为，必须共用而非各写一份（§6.3）——两份实现必然漂移。本任务是既有代码重构，对用户行为零变更。

**Files:**

- Create: `src/lib/restore-session.ts`
- Test: `src/lib/restore-session.test.ts`
- Modify: `src/manager/App.tsx`

**Interfaces:**

- Produces: `export async function restoreSession(session: SavedSession, mode: Settings['newWindowMode']): Promise<void>`
- Consumes: `createWindowBySetting`（`src/lib/open-window.ts`）、`SavedSession` / `Settings`（`src/lib/storage.ts`）。

- [ ] **Step 1: 写失败测试**

断言与 `App.tsx` 现有行为一致：按顺序全量打开、还原 pinned、会话本身不被消耗。

```ts
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { restoreSession } from './restore-session';

describe('restoreSession', () => {
  it('按顺序在新窗口打开全部 URL，并只对 pinned 条目调用 update', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.create.mockResolvedValue({
      id: 9002,
      tabs: [{ id: 11 }, { id: 12 }],
    } as chrome.windows.Window);

    await restoreSession(
      {
        id: 's1',
        name: 'x',
        createdAt: 1,
        tabs: [
          { url: 'https://a.com/', title: 'a' },
          { url: 'https://b.com/', title: 'b', pinned: true },
        ],
      },
      'same',
    );

    expect(chromeMock.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: ['https://a.com/', 'https://b.com/'], focused: true }),
    );
    expect(chromeMock.tabs.update).toHaveBeenCalledTimes(1);
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(12, { pinned: true });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

- [ ] **Step 3: 搬运实现，App.tsx 改为调用**

把 `App.tsx` 中 `restoreSession` 的函数体原样搬入新模块，签名补上 `mode` 参数（原先从闭包读 `settings.newWindowMode`）。`App.tsx` 保留同名局部函数作为薄封装，或直接在调用点传入 `settings.newWindowMode`——两种都可，以 diff 更小者为准。

- [ ] **Step 4: 跑测试确认通过**

必须同时跑 `pnpm vitest run src/manager/App.test.tsx` 确认既有会话恢复断言不回归。

- [ ] **Step 5: 全量校验并提交**

---

### Task 3: background 接线、manifest 与文档

**Files:**

- Modify: `src/test/chrome-mock.ts`
- Modify: `src/background.ts`
- Modify: `src/background.test.ts`
- Modify: `public/manifest.json`
- Modify: `src/i18n/zh_CN.json`、`src/i18n/en.json`
- Modify: `CLAUDE.md`

**Interfaces:**

- Consumes: Task 1 的全部导出、Task 2 的 `restoreSession`、既有 `safeOpenManager`、`removeReadLater`（`src/lib/storage.ts`）。

- [ ] **Step 1: 给 chrome mock 补 omnibox**

```ts
omnibox: {
  setDefaultSuggestion: vi.fn(),
  onInputStarted: new MockEvent(),
  onInputChanged: new MockEvent(),
  onInputEntered: new MockEvent(),
  onInputCancelled: new MockEvent(),
},
```

- [ ] **Step 2: 写失败测试**

在 `src/background.test.ts` 追加。关键断言：自有页面被排除、建议条数受限、三类执行语义、默认建议兜底、**不缓存**。

```ts
describe('omnibox', () => {
  it('建议中排除自有页面（管理页与新标签页）', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, title: 'x 普通页' }),
      makeTab({ id: 2, url: 'chrome-extension://test-id/src/manager/index.html', title: 'x 管理页' }),
      makeTab({ id: 3, url: 'chrome-extension://test-id/src/newtab/index.html', title: 'x 新标签页' }),
    ]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0]).toHaveLength(1);
  });

  it('选中标签页 → 聚焦其窗口并激活该 tab', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.omnibox.onInputEntered.emit('tab:7', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.windows.update).toHaveBeenCalled());
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(7, { active: true });
  });

  it('无法解析的 content（用户直接回车执行默认建议）→ 打开管理页', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.omnibox.onInputEntered.emit('mv3', 'currentTab');
    await vi.waitFor(() => expect(chromeMock.tabs.create).toHaveBeenCalled());
  });

  it('每次输入都重新读取数据，不使用上一次的缓存', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1, title: 'x 一' })]);
    chromeMock.omnibox.onInputChanged.emit('x', vi.fn());
    await vi.waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalledTimes(1));
    chromeMock.tabs.query.mockResolvedValue([]);
    const suggest = vi.fn();
    chromeMock.omnibox.onInputChanged.emit('x', suggest);
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled());
    expect(suggest.mock.calls[0][0]).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

- [ ] **Step 4: 实现 background 接线**

要点：

- `onInputChanged(text, suggest)`：并发读 `chrome.tabs.query({})` 与 `chrome.storage.local.get()`，用 `ownPagePrefix` 前缀过滤 tabs，调 `matchOmnibox` → `buildSuggestion` → `suggest(...)`；同时 `setDefaultSuggestion({ description: defaultDescription(text, n) })`。
- `onInputEntered(text, disposition)`：`parseContent` → 三类分支（§6.2）；解析失败 → `safeOpenManager()`。
- 稍后阅读分支：`currentTab` 用 `chrome.tabs.update(undefined, { url })`（当前 tab 导航），其余 `chrome.tabs.create({ url })`；两者都调 `removeReadLater` 后写回 storage。
- 会话分支：读 `settings.newWindowMode` 后调 Task 2 的 `restoreSession`。
- 所有 `chrome.*` 写操作沿用 `safeOpenManager` 的异常处理方式吞掉 reject（§9）——SW 里无人看得见的报错不值得抛。
- **不得**在模块作用域缓存任何数据。

- [ ] **Step 5: manifest 与 i18n**

`public/manifest.json` 增加 `"omnibox": { "keyword": "ts" }`。i18n 补默认建议三态文案与三个类型标签（`标签页` / `稍后阅读` / `会话`）。

> 注意：background 是 service worker，取文案不能用页面层的 `useT()`。若 i18n 模块无法在 SW 环境直接复用，改用 `chrome.i18n.getMessage` 并把这几条文案放进 `public/_locales/`——以能跑通且只有一处文案来源为准，不要在 background 里硬编码中英文分支。

- [ ] **Step 6: 文档同步**

`CLAUDE.md` 中描述 background 的语句由「唯一职责是图标点击/快捷键 → 聚焦或创建管理页单例」改为「扩展的命令入口：图标点击 / 快捷键 → 管理页单例，地址栏关键字 → 搜索自有数据」。`src/background.ts` 顶部注释同步。

- [ ] **Step 7: 跑测试确认通过**

- [ ] **Step 8: 全量校验并提交**

---

## 手动验收（浏览器）

`pnpm build` 后在 `chrome://extensions` 重新加载扩展（改了 background 与 manifest，必须点 ↻）：

1. 地址栏输入 `ts` 按 `Tab`，出现「搜索 Tab Station」芯片。
2. 输入一个已开标签页标题里的词 → 建议列表出现该标签页，回车跳转并聚焦其窗口。
3. 输入命中稍后阅读的词 → 回车打开该 URL，且该条目从稍后阅读清单消失。
4. 输入命中会话名的词 → 回车在新窗口恢复该会话，且会话仍在列表中（模板式）。
5. 输入无匹配的乱码 → 只剩默认建议，文案为「没有匹配项」，回车打开管理页，**不触发任何网页搜索**。
6. 标题含 `&` 的页面（例如任意带 `&` 的搜索结果页）出现在建议中时渲染正常，不整条消失。
7. 管理页与新标签页自身不出现在任何建议中。

## Self-Review

**Spec 覆盖对照：**

| Spec 章节 | 落到 |
| --- | --- |
| §2 与已否决搜索功能的边界 | Global Constraints 第 4 条；Task 3 Step 4 默认建议兜底；手动验收 5 |
| §3 关键字与触发 | Task 3 Step 5 manifest |
| §4 匹配与排序（归一化、字段、方式、类内排序、限额、类间顺序、上限、自有页面排除） | Task 1 Step 1/3 全部；自有页面排除在 Task 3 Step 2 断言 |
| §5.1 单行富文本格式 | Task 1 Step 3 `buildSuggestion` |
| §5.2 XML 转义 | Task 1 Step 1「含 & 的标题」用例 + Step 3 转义顺序 |
| §5.3 默认建议三态 | Task 1 `defaultDescription` + Task 3 Step 4 |
| §6.1 标识回传与解析失败兜底 | Task 1 `toContent`/`parseContent` + Task 3 Step 2 第三个用例 |
| §6.2 三类执行语义与 disposition | Task 3 Step 4 |
| §6.3 会话恢复抽取 | Task 2 全部 |
| §7 SW 约束（现场重读、不缓存、不防抖） | Global Constraints 第 3 条 + Task 3 Step 2 第四个用例 |
| §8 background 职责边界与文档同步 | Task 3 Step 6 |
| §9 边界情况（目标已关闭、条目已移除、空白输入、取消） | Task 1 空白输入用例；Task 3 Step 4 统一吞异常 |
| §10 测试要点 1–5 | Task 1 Step 1、Task 2 Step 1、Task 3 Step 2 逐条对应 |
| §11 非目标 | 计划内无对应实现，Global Constraints 已声明不做 |

**类型一致性核对：** `OmniItem` 仅在 `lib/omnibox.ts` 定义，`background.ts` 从该处 import；`toContent` / `parseContent` 的 `kind` 取自同一联合类型，新增类型时三处编译期即报错。`restoreSession(session, mode)` 二参签名在 Task 2 定义、Task 3 与 `App.tsx` 调用一致。

**已知风险：**

1. **i18n 在 service worker 中的可用性未经验证**（Task 3 Step 5）。页面层 i18n 是自研 React 模块，SW 里没有 React 上下文。若直接 import 不可行，退路是 `chrome.i18n.getMessage` + `public/_locales/`，该机制 manifest 层已在用。这是本计划唯一需要在实现时现场判断的分叉。
2. **`chrome.omnibox.SuggestResult` 的类型定义**依赖 `@types/chrome` 版本，若缺失则在 `lib/omnibox.ts` 内自定义等价接口，不要为此降级 `strict`。
3. 关键字 `ts` 可能与用户已安装的其他扩展冲突，冲突时以 Chrome 解析为准，扩展无法检测——spec §3 已接受此风险，实现无需处理。
