# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

**Tab Station（标签工作站）** —— Chrome Manifest V3 扩展，集中管理真实浏览器 tab，附带「稍后阅读」与「窗口会话」两类本地持久化数据。无后端、无网络请求；全部状态存于 `chrome.storage.local`。

领域词汇表（ubiquitous language）在 [CONTEXT.md](CONTEXT.md)——写 spec 或代码前先读，术语（管理页/设置页、模式/视图、稍后阅读/会话、URL 归一化、重复组等）必须与其一致。产品命名写法遵循 [docs/naming.md](docs/naming.md)（normative）。

## 常用命令

```bash
make check        # fmt-check + lint + typecheck + test，提交前必过
pnpm test         # vitest run（全部测试）
pnpm vitest run src/lib/url.test.ts   # 跑单个测试文件
pnpm test:watch   # vitest watch，逻辑开发主循环
pnpm build        # tsc --noEmit && vite build → dist/
pnpm dev          # vite build --watch（产物型 watch，不是 dev server）
make package      # build + 打包 dist/ 为 tab-station-<version>.zip
```

**没有 dev server / HMR**：扩展从 `dist/` 目录以「加载已解压」方式装入 Chrome。改 UI 刷新 manager 标签页即可；改 `background.ts` 或 manifest 必须在 `chrome://extensions` 点扩展的 ↻。完整刷新规则与 SW 调试方法见 [docs/local-debugging.md](docs/local-debugging.md)。

## 架构

技术栈：React 18 + TypeScript（strict）+ Vite + Vitest/jsdom/Testing Library + @dnd-kit，包管理 pnpm。

**三个构建入口**（`vite.config.ts` rollup 多入口）：

- `src/manager/` — 管理页（React SPA），扩展的主界面；本身是一个 tab，通过单例逻辑（`src/lib/singleton.ts`）保证按作用域只开一个。
- `src/settings/` — 设置页（独立 React 入口），经扩展「选项」打开，改动即时保存生效。
- `src/background.ts` — MV3 service worker，扩展的命令入口：图标点击/快捷键 → 管理页单例，地址栏关键字 → 搜索自有数据。**SW 随时休眠，不得持有内存状态**——每次唤醒都从 storage 重读。产物固定名 `background.js`（manifest 引用，不可加 hash）。

管理页路径唯一定义在 `src/lib/manager-url.ts` 的 `MANAGER_PATH`，`vite.config.ts` 直接 import 它——改页面路径只改这一处。

**版本号单一来源**：只写在 `package.json` 的 `version`。`public/manifest.json` 不含 `version` 字段，由 `vite.config.ts` 的 `manifestVersion` 插件构建期注入 `dist/manifest.json`——因此 `public/` 不是可加载的扩展目录，只有 `dist/` 是。git tag 不是来源而是断言：Release 流水线校验 tag 与 `package.json` 版本相等，不等即失败。发布流程见 [README 的持续集成与发布](README.md#持续集成与发布)，设计见 [docs/specs/2026-08-17-release-automation.md](docs/specs/2026-08-17-release-automation.md)。

**分层约定**：

- `src/lib/` — 纯函数领域逻辑（storage 数据模型与操作、URL 归一化、去重、分组、折叠、DnD 计算、关闭动效），不碰 React；数据模型（`ReadLaterItem` / `SavedSession` / `Settings`）定义在 `src/lib/storage.ts`。
- `src/hooks/` — 把 `chrome.storage` / `chrome.tabs` 事件桥接为 React state（`useStorageState`、`useTabs`、`useTheme`）。
- `src/components/` — 管理页 UI 组件，逐组件配套 `.test.tsx`。
- `src/i18n/` — 自研轻量 i18n（zh_CN / en JSON + resolve），manifest 层文案在 `public/_locales/`。

**测试基建**（`src/test/`）：`chrome-mock.ts` 提供完整 `chrome.*` mock（storage、events），`setup.ts` 在模块级安装并于每个用例前重置；`navigator.language` 钉死为 `zh-CN`（App 级测试断言中文文案）；`factories.ts` 造测试数据。逻辑调试优先走 Vitest，浏览器只用于验收真实 `chrome.*` 行为。

## 开发范式：SDD + TDD

写或改任何代码前，遵循 agent 编码行为规则（think-before-coding、simplicity-first、surgical-changes、goal-driven execution、root-cause reasoning）——见 `engineering-guidelines` skill。

### Specification-Driven Development (SDD)

1. 先写或更新相关 spec（约定文档在 `docs/`；功能/设计 spec 在 `docs/specs/`）。
2. spec 评审通过后，
3. 对照 spec 实现。

### Test-Driven Development (TDD)

1. 从 spec 推出失败测试。
2. 写最小实现使其通过。
3. 保持绿灯下重构。

实现期 TDD 细节（AAA 结构、命名、mock、覆盖率）见 `code-conventions` skill。

**所有代码变更必须能追溯到某个 spec 文档。**

## 文档权威性：Contracts vs Design Specs

两类文档权威性不同：

- **Contracts（normative，长期有效）** — `docs/` 直下的约定文档（当前为 `naming.md`、`local-debugging.md`）。与现实保持同步；代码与之偏离时**代码是缺陷**——修代码，或先审慎修订约定。
- **Design specs（descriptive，时点快照）** — `docs/specs/` 的功能设计与 `docs/plans/` 的实施计划。为驱动某次开发而写，随迭代会漂移过时。

**读 vs 写：**

- **写**新逻辑 → 从 spec 出发（SDD）：先更新设计 spec，再实现。
- **读/核实「系统今天的行为」** → **以当前代码为准**。设计 spec 只代表写作时的意图。
- **spec 与代码冲突** → 不可盲信 spec。设计 spec 按漂移处理：以代码核实并标记 spec 待更新；contract 则相反——contract 为准，代码可疑。

## Implementation Plans

功能计划放 `docs/plans/`，声明目标、范围、依赖、步骤、验收标准，并链接其实现的 spec。

1. **Spec first** — 先在 `docs/specs/` 写好并通过设计 spec，再做实施计划。
2. **一功能一计划** — 文件名 `YYYY-MM-DD-feature.md`。
3. **声明依赖** — 计划必须链接 spec；有顺序要求时写 `Depends on: <other-plan>`。

**大计划拆子计划**：单个计划一遍评审/执行不完时，拆为父计划 `YYYY-MM-DD-feature.md`（总览 + 子计划链接与推荐执行顺序）+ 子计划 `YYYY-MM-DD-feature--<slug>.md`（各自独立的目标/范围/依赖/步骤/验收）。不要过度拆分——只拆出琐碎碎片就保持单计划。仓库内已有实例：`docs/plans/2026-08-15-tabstation.md` 及其 `--lib` / `--ui-list` 等子计划。

## Conventions

### Convention Documents

通用横切约定（测试、commit message、语言规则等）**不**复制进本仓库——运行时引用 `code-conventions` skill。项目私有约定放 `docs/` 直下；新增时必须在本文件加索引条目。

### Spec Document Index (Mandatory Maintenance)

**Rule**：每个 governing 文档（约定、领域契约）必须能从本文件发现。CLAUDE.md 是上下文加载入口——未被引用的 spec 对 agent 不可见，会被忽略或违背。

**Exception**：`docs/specs/` 下的功能 spec 数量多且短命，不需要索引条目。

**How**：`docs/` 直下的每个约定文档必须出现在下方 Repository Structure 树或正文引用中，带实际文件名与相对链接。

## Repository Structure

```
tabstation/
├── CLAUDE.md            # 本文件——项目规则、约定与模块指引
├── AGENTS.md            # → @CLAUDE.md
├── CONTEXT.md           # 领域词汇表（ubiquitous language）——写 spec/代码前先读
├── ROADMAP.md           # 延后待办（V1 推迟的性能/功能项）
├── Makefile             # build / package / dev / test / lint / check 等任务入口
├── .github/workflows/   # CI（push/PR 跑 make check）与 Release（tag → zip + GitHub Release）
├── public/              # manifest.json、_locales/、icons/（原样拷入 dist/）
├── src/
│   ├── background.ts    # MV3 service worker（管理页单例入口）
│   ├── manager/         # 管理页 React 入口
│   ├── settings/        # 设置页 React 入口
│   ├── components/      # 管理页 UI 组件
│   ├── hooks/           # chrome.* ↔ React state 桥接
│   ├── lib/             # 纯函数领域逻辑与数据模型
│   ├── i18n/            # 页面层 i18n（zh_CN / en）
│   ├── styles/          # 设计 token
│   └── test/            # chrome mock、setup、测试工厂
└── docs/
    ├── naming.md        # 产品命名约定（normative）——名称 `Tab Station`、写法规范、判据
    ├── local-debugging.md  # 本地调试手册——watch 构建、扩展加载/刷新、双 DevTools
    ├── specs/           # 功能/设计 spec（the "what"）
    └── plans/           # 实施计划（the "how"）
```
