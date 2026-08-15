# tabstage 设计规格（Design Spec）

- 日期：2026-08-15
- 状态：待审阅
- 参考实现：`refs/tab-out`（MIT，纯 MV3 扩展，按域名聚合 tab 的新标签页）

## 1. 概述

tabstage 是一个 Chrome 浏览器扩展（Manifest V3），提供一个集中式 TAB 管理页面：查看、排序、移动、去重所有打开的 tab，并支持稍后阅读与窗口会话保存。100% 本地运行，无服务端、无外部 API 调用。

## 2. 目标与非目标

### 目标

1. 点击扩展图标（或快捷键）打开管理页，管理所有 tab
2. 列表视图下拖拽调整 tab 顺序，同步到真实浏览器
3. 两种模式：按窗口分区 / 全部 tab 合并
4. 将 tab 移动到其他窗口或新窗口（全屏 / 同尺寸）
5. 域名视图：同域名 tab 自动聚合
6. 稍后阅读：保存并自动关闭当前 tab
7. 窗口会话：保存当前窗口，之后一键在新窗口恢复全部 tab
8. 管理页单例：全局一个 / 每窗口一个（可设置）
9. 重复 tab 标记 + 一键去重
10. 快速打开浏览器历史记录页
11. 展示每个 tab 的最后浏览时间
12. 关闭动效（swoosh 音效 + 五彩纸屑），移植自 tab-out
13. 多语言：English / 简体中文

### 非目标（明确不做）

- **搜索功能**：不做 tab 过滤搜索，不做历史搜索（已在评审中移除）
- **内嵌历史面板**：不做最近记录列表 / 搜索历史 /「打开完整历史」按钮，历史仅保留一个直达入口
- **接管新标签页**：MV3 的 `chrome_url_overrides` 是静态声明，无法动态开关，且扩展无法把用户导航回原生新标签页，故砍掉
- **自动化 E2E**：真实浏览器加载扩展的 Playwright 方案维护成本高于收益，以手动验收清单代替
- **Chrome 之外的浏览器**：V1 仅 Chrome

## 3. 技术栈

| 项 | 选型 |
|----|------|
| 扩展规范 | Chrome Manifest V3 |
| 构建 | Vite（不用 crxjs 等扩展框架，`vite build --watch` + 手动 reload） |
| UI | React + TypeScript |
| 拖拽 | dnd-kit |
| 存储 | `chrome.storage.local` |
| 测试 | Vitest + Testing Library + 手写 `chrome.*` mock |
| 音效 | Web Audio API 合成（无音频文件） |
| 权限 | 仅 `tabs` + `storage`（无 host 权限、无 history 权限） |

## 4. 产品形态

### 4.1 入口

- 点击扩展图标，或快捷键（`chrome.commands`，默认 `Cmd+Shift+E` / `Ctrl+Shift+E`）
- 不接管新标签页

### 4.2 管理页单例（background 唯一职责）

设置项 `managerPageScope` 控制：

- `global`（默认）：点击时在全浏览器查找已存在的管理页 tab，找到则聚焦其窗口并激活该 tab；没有则在当前窗口新建
- `per-window`：只在当前窗口查找，找到聚焦，没有则新建

### 4.3 页面布局

```
┌──────────────────────────────────────────────────────────┐
│ 工具栏: [窗口模式|全部模式] [列表|域名] [一键去重]        │
│         [🕘历史] [⚙设置]                                 │
├───────────────────────────────────────┬──────────────────┤
│ 主区域                                │ 侧栏             │
│                                       │ （仅当稍后阅读    │
│ ▼ 窗口 1（当前窗口）[💾保存] [✕关闭]  │   有记录时显示）  │
│   ⣿ favicon 标题  域名  3分钟前  ⋯   │                  │
│   ⣿ favicon 标题  域名  2小时前  ⋯   │ 📚 稍后阅读       │
│ ▼ 窗口 2           [💾保存] [✕关闭]  │   · 条目…        │
│   ⣿ ...                              │                  │
│                                       │                  │
│ ▼ 💾 已保存会话（可折叠分区）          │                  │
│   · 会话名 (N tabs)  [打开] [删除]    │                  │
└───────────────────────────────────────┴──────────────────┘
```

- **工具栏**：模式切换、视图切换、一键去重、历史入口（点击 = 新 tab 打开 `chrome://history`）、设置
- **主区域**：tab 列表（见 §5）+ 底部「已保存会话」可折叠分区
- **侧栏**：仅「稍后阅读」一个面板，**有记录才显示**；空时侧栏不渲染，主区域占满全宽
- **窗口分区标题右侧**（仅窗口模式）：[💾 保存窗口]（点击即保存，无弹窗）、[✕ 关闭窗口]

### 4.4 tab 行

每行展示：favicon、标题、域名、最后浏览时间（相对时间，如「3 分钟前」）。

悬停操作区：跳转（聚焦该 tab 所在窗口并激活）/ 关闭 / 稍后阅读 / 「移动到 ▾」菜单。

重复 tab 行有高亮标记（见 §5.6）。

## 5. 功能行为

### 5.1 模式 × 视图（正交组合）

| | 列表视图 | 域名视图 |
|---|---|---|
| **窗口模式** | 按窗口分区，当前窗口置顶；分区内按真实 index 排列；**可拖拽** | 每个窗口分区内按域名聚合；只读 |
| **全部模式** | 所有窗口的 tab 合并为一份列表（按窗口顺序 + index）；不可拖拽 | 全部 tab 按域名聚合；只读 |

### 5.2 拖拽（dnd-kit）

仅在 **窗口模式 × 列表视图** 启用：

- 同分区内拖动 = `chrome.tabs.move(tabId, { index })` 调整真实顺序
- 拖到另一个窗口分区 = `chrome.tabs.move(tabId, { windowId, index })` 跨窗口移动

全部模式和域名视图不可拖拽。

### 5.3 「移动到 ▾」菜单

- 列出其他所有窗口（显示为「窗口 2（5 tabs）」）
- **新窗口-全屏**：`chrome.windows.create` 后 `state: 'maximized'`
- **新窗口-同尺寸**：复制源窗口 bounds（left/top/width/height），稍作偏移防完全重叠
- 移走窗口最后一个 tab 时该窗口自然关闭（Chrome 默认行为，不额外处理）

### 5.4 稍后阅读

- **保存**：写入 `readLater` 列表 + 关闭该 tab（触发关闭动效）；同 URL 已存在则只更新 `savedAt`，不产生重复条目
- **打开**：新 tab 打开该 URL + 立即从列表移除（「打开即移除」，列表始终是待读清单）
- 若被保存的 tab 是窗口最后一个 tab，窗口随之关闭（Chrome 默认行为）

### 5.5 窗口会话

- **保存**（窗口分区标题旁按钮，点击即保存无弹窗）：
  - 快照该窗口所有 tab 的 `{ url, title, favIconUrl }`
  - **排除**管理页自身和 `chrome://` 页面
  - 默认名 = 保存日期时间，之后可在会话分区内重命名
  - 设置项 `closeWindowAfterSave`（默认 false）为 true 时，保存后自动关闭该窗口
- **恢复**：`chrome.windows.create` 新窗口依次打开会话内全部 URL，并聚焦新窗口
- **模板式**：恢复后会话保留，可反复打开；删除需手动
- 会话数据持久化于 `chrome.storage.local`

### 5.6 去重

- URL 归一化：去掉 hash（`#` 及之后部分），其余保持原样
- 归一化后相同 URL 出现 ≥ 2 次即为重复，所有重复行高亮标记
- 工具栏「一键去重」：每组重复保留 `lastAccessed` 最新的一个，关闭其余（触发关闭动效）
- 纯计算，无存储

### 5.7 域名视图

- 按 `hostname` 聚合成组，组按 tab 数降序排列，组内保持真实顺序
- 组可折叠；组内单 tab 的操作（跳转/关闭/稍后阅读/移动）照常可用

### 5.8 历史入口

工具栏 [🕘历史] 按钮：`chrome.tabs.create({ url: 'chrome://history' })`。无内嵌面板，无 `history` 权限。

### 5.9 最后浏览时间

直接读 Chrome 原生 `tab.lastAccessed` 字段，不自己记录、不持久化。用 `Intl.RelativeTimeFormat` 按当前语言输出相对时间。

### 5.10 关闭动效（移植自 tab-out，MIT）

所有关闭动作（单 tab 关闭、一键去重、关闭窗口、稍后阅读收纳）复用同一套动效：

- **音效**：Web Audio API 合成 swoosh —— 白噪声 buffer + 带通滤波器从 4000Hz 指数扫到 400Hz，时长 0.25s；Audio 不可用时静默失败
- **纸屑**：从被关闭元素中心迸发 17 个粒子（圆形/方形随机，5–11px），随机角度 + 上抛偏置 + 重力模拟，`requestAnimationFrame` 驱动，700–900ms 后移除
- **退场**：元素 fade + scale down（约 300ms）后从 DOM 移除

实现放在 `src/lib/effects/`，参考 `refs/tab-out/extension/app.js` 的 `playCloseSound` / `shootConfetti` / `animateCardOut`。

## 6. 数据模型与存储

运行时数据（tab、窗口）不落盘——Chrome 本身是唯一数据源：页面启动时 `chrome.tabs.query({})` + `chrome.windows.getAll()` 拉全量，之后靠 `tabs.onCreated/onRemoved/onUpdated/onMoved/onActivated/onAttached/onDetached` 与 `windows.onCreated/onRemoved/onFocusChanged` 事件增量刷新。

持久化仅三个存储键，全部在 `chrome.storage.local`：

```ts
// 键: readLater
interface ReadLaterItem {
  id: string;          // uuid
  url: string;
  title: string;
  favIconUrl?: string;
  savedAt: number;     // 保存时间戳
}

// 键: sessions
interface SavedSession {
  id: string;
  name: string;        // 默认 = 保存日期时间，可重命名
  createdAt: number;
  tabs: { url: string; title: string; favIconUrl?: string }[];
}

// 键: settings
interface Settings {
  managerPageScope: 'global' | 'per-window';  // 默认 'global'
  closeWindowAfterSave: boolean;              // 默认 false
  language: 'auto' | 'en' | 'zh-CN';          // 默认 'auto'（跟随浏览器）
}
```

**多管理页一致性**：监听 `chrome.storage.onChanged`，任一页面修改稍后阅读/会话/设置后，其他管理页自动同步刷新。

## 7. 多语言（i18n）

- **UI 文案**：自定义轻量方案——`src/i18n/en.json` + `src/i18n/zh_CN.json` 字典 + `t()` hook，不引第三方库。`settings.language` 为 `'auto'` 时跟随 `navigator.language`
- **manifest 文案**（扩展名称/描述）：Chrome 原生 `_locales/en/messages.json` + `_locales/zh_CN/messages.json`，`default_locale: "en"`
- 设置对话框内含语言选择器
- 相对时间用 `Intl.RelativeTimeFormat` 按当前语言输出

## 8. 架构与项目结构

架构原则：**管理页直连 Chrome API**。页面直接调用 `chrome.tabs / windows` 读写并监听事件；background service worker 只处理图标点击/快捷键的单例逻辑。不设 background 中心化状态代理（MV3 service worker 随时休眠，中间层只增加复杂度）。

```
tabstage/
├── manifest.json            # MV3；permissions: ["tabs","storage"]
├── vite.config.ts           # 两个入口：manager 页面 + background
├── _locales/                # en / zh_CN（manifest 文案）
├── src/
│   ├── background.ts        # 仅：图标点击/快捷键 → 单例逻辑
│   ├── manager/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx          # 模式/视图状态 + 布局骨架
│   ├── components/          # Toolbar / WindowSection / TabRow / DomainGroup
│   │                        # SessionSection / ReadLaterSidebar / SettingsDialog
│   ├── hooks/
│   │   ├── useTabs.ts       # query 全量 + tabs/windows 事件增量刷新
│   │   └── useStorageState.ts  # storage.local 读写 + onChanged 同步
│   ├── i18n/                # en.json / zh_CN.json + t() hook
│   └── lib/                 # 纯函数层（TDD 主战场）
│       ├── dedupe.ts        # URL 归一化 + 重复分组 + 保留策略
│       ├── grouping.ts      # 域名聚合、窗口分区、排序
│       ├── singleton.ts     # 单例查找（给定 tab 列表 → 聚焦目标）
│       ├── storage.ts       # ReadLaterItem/SavedSession/Settings 读写
│       └── effects/         # swoosh 音效 + 纸屑动效（移植自 tab-out）
└── docs/                    # spec / plan
```

manifest 要点：

```json
{
  "manifest_version": 3,
  "default_locale": "en",
  "permissions": ["tabs", "storage"],
  "background": { "service_worker": "background.js" },
  "action": { "default_title": "tabstage" },
  "commands": { "open-manager": { "suggested_key": { "default": "Ctrl+Shift+E", "mac": "Command+Shift+E" } } }
}
```

## 9. 测试策略

遵循项目 TDD 约定（先写失败测试，再实现）：

1. **单元测试（Vitest）**——`lib/` 全部纯函数：
   - `dedupe`：URL 归一化（去 hash）、重复分组、保留 `lastAccessed` 最新
   - `grouping`：域名聚合、组排序（tab 数降序）、窗口分区排序（当前窗口置顶）
   - `singleton`：global / per-window 两种范围的查找逻辑
   - `storage`：会话快照过滤（排除管理页自身与 `chrome://`）、稍后阅读同 URL 合并
2. **Hook/组件测试**——手写 `chrome.*` mock + Testing Library：
   - `useTabs`：事件驱动刷新
   - `useStorageState`：`onChanged` 跨页同步
   - 拖拽落点 → `tabs.move` 参数正确
   - 稍后阅读「保存即关 tab」、「打开即移除」
3. **手动验收清单**（代替自动化 E2E，装载扩展逐条过）：
   - [ ] 点击图标/快捷键打开管理页；global 模式下重复点击聚焦既有页而非新开
   - [ ] per-window 模式下每窗口各自维护一个管理页
   - [ ] 窗口模式列表视图内拖拽，真实 tab 顺序同步变化
   - [ ] 拖拽 tab 到另一窗口分区，tab 实际移动过去
   - [ ] 「移动到 ▾」→ 其他窗口 / 新窗口-全屏 / 新窗口-同尺寸均生效
   - [ ] 域名视图正确聚合，组可折叠，组内操作可用
   - [ ] 稍后阅读：保存即关 tab；侧栏仅有记录时显示；打开即移除
   - [ ] 保存窗口 → 会话出现在主区分区；恢复 → 新窗口打开全部 tab；会话保留可重复打开
   - [ ] `closeWindowAfterSave` 开启时保存后窗口关闭
   - [ ] 重复 tab 高亮；一键去重保留最近浏览的那个
   - [ ] 🕘历史按钮新 tab 打开 chrome://history
   - [ ] 每行显示相对格式的最后浏览时间
   - [ ] 关闭动作有 swoosh 音效 + 纸屑动效
   - [ ] 切换语言（auto/en/zh-CN）后全部文案切换
   - [ ] 两个管理页同时打开时，稍后阅读/会话/设置变更互相同步

## 10. 评审记录（关键决策）

| 决策点 | 结论 |
|---|---|
| 技术栈 | Vite + React + TS（复杂 UI 交互，vanilla 不经济） |
| 入口 | 仅图标 + 快捷键；新标签页接管因 MV3 静态声明限制砍掉 |
| 拖拽 × 域名聚合 | 拆成两种视图：列表可拖（同步真实顺序），域名视图只读 |
| 稍后阅读生命周期 | 打开即移除 |
| 会话性质 | 模板式可反复打开；保存后是否关窗口由设置项控制，无弹窗 |
| 去重方式 | 标记 + 一键清理（保留最近浏览），不自动静默关闭 |
| 历史记录 | 仅保留直达 chrome://history 的入口，无内嵌面板、无搜索 |
| 搜索 | 全部移除（tab 过滤、历史搜索均不做） |
