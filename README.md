<p align="center">
  <img src="design/assets/logo/tab-station-logo-horizontal.svg" alt="Tab Station" width="320">
</p>

# Tab Station — 标签工作站

Tab Station 是一个 Chrome Manifest V3 扩展，把所有窗口中的真实标签页集中到一个管理页里操作。它不是只读的标签列表，而是一个「写穿式」操控台：拖拽、移动、关闭、去重都会直接作用于浏览器中的真实标签页。

扩展附带「稍后阅读」与「窗口会话」两类本地持久化数据。没有后端服务，不发起网络请求，全部状态保存在 `chrome.storage.local`。

<p align="center">
  <img src="screenshots/manager-by-window-light.png" alt="管理页窗口模式（浅色主题）" width="800">
  <br>
  <em>窗口模式：按窗口分区展示所有真实标签页</em>
</p>

<p align="center">
  <img src="screenshots/manager-all-tabs-dark.png" alt="管理页全部模式（深色主题）" width="800">
  <br>
  <em>全部模式：跨窗口按域名聚合（深色主题）</em>
</p>

## 功能特性

- **集中管理真实标签页**：在一个页面查看并操作所有窗口的标签页；支持拖拽排序、跨窗口移动、关闭窗口和拆分到新窗口。
- **三种模式**：窗口模式按窗口分区展示，全部模式跨窗口按域名聚合，已保存会话展示可复用的会话卡片。
- **一键去重**：基于全项目统一的 URL 归一化规则识别重复标签页，执行前可预览将保留和关闭的条目，并优先保留固定标签。
- **稍后阅读**：保存时关闭源标签页；打开时自动从清单移除，也支持直接删除或在新窗口打开。
- **窗口会话**：将窗口保存为模板式快照，可反复恢复；会话支持重命名，条目支持排序、单条打开和删除。
- **本地优先与双语界面**：数据仅保存在本机，界面支持中文和英文，并提供浅色、深色、自动三种主题。

## 安装体验

Tab Station 当前需要从源码构建后以未打包扩展方式加载：

1. 安装 [Node.js](https://nodejs.org/) 和 [pnpm](https://pnpm.io/)。
2. 在仓库根目录安装依赖并构建：

   ```bash
   pnpm install
   pnpm build
   ```

3. 打开 Chrome 的 `chrome://extensions/`。
4. 开启右上角的「开发者模式」。
5. 点击「加载已解压的扩展程序」，选择仓库下的 `dist/` 目录。
6. 点击工具栏中的 Tab Station 图标，或使用默认快捷键 `Ctrl+Shift+E`（macOS 为 `Command+Shift+E`）打开管理页。

## 开发指南

项目使用 React 18、TypeScript、Vite 和 Vitest。扩展没有传统 dev server 或 HMR；`pnpm dev` 运行的是产物型 watch 构建，输出到 `dist/`。

```bash
make install     # pnpm install
make dev         # vite build --watch
make build       # tsc --noEmit && vite build
make test        # vitest run
make lint        # eslint .
make typecheck   # tsc --noEmit
make fmt         # prettier --write .
make check       # fmt-check + lint + typecheck + test
```

日常开发流程：

1. 执行 `make dev` 启动 watch 构建。
2. 在 `chrome://extensions/` 中加载或刷新 `dist/` 扩展。
3. 修改管理页或设置页后，刷新对应 Chrome 标签页即可。
4. 修改 `background.ts`、`manifest.json` 或 `_locales/` 后，需要点击扩展卡片上的刷新按钮。

更完整的 MV3 调试说明见[本地调试手册](docs/local-debugging.md)。

## 项目结构

```text
tabstation/
├── public/               # manifest.json、多语言文案与图标
├── src/
│   ├── background.ts     # MV3 service worker，负责打开管理页单例
│   ├── manager/          # 管理页 React 入口
│   ├── settings/         # 设置页 React 入口
│   ├── components/       # 管理页 UI 组件
│   ├── hooks/            # chrome.* 与 React state 的桥接
│   ├── lib/              # 领域逻辑、数据模型与纯函数
│   ├── i18n/             # 页面层多语言支持
│   ├── styles/           # 设计 token 与样式
│   └── test/             # chrome mock 与测试工具
├── docs/                 # 约定文档、设计规格与实施计划
└── design/               # 品牌与设计交付物
```

分层约定：

- `src/lib/` 存放不依赖 React 的领域逻辑和数据模型。
- `src/hooks/` 将 `chrome.storage` 与 `chrome.tabs` 事件桥接为 React state。
- `src/components/` 存放管理页组件，并按组件配套测试。
- `src/manager/` 与 `src/settings/` 是两个独立 UI 入口。

## 权限与隐私

扩展只申请以下权限：

| 权限 | 用途 |
| --- | --- |
| `tabs` | 读取和操作真实标签页与窗口 |
| `storage` | 在本机保存设置、稍后阅读和窗口会话 |
| `favicon` | 使用 Chrome 本地 favicon 数据展示站点图标 |

Tab Station 没有后端服务，不上传浏览记录，也不做数据分析。

## 相关文档

- [领域词汇表](CONTEXT.md)
- [项目开发约定](CLAUDE.md)
- [产品命名规范](docs/naming.md)
- [本地调试手册](docs/local-debugging.md)
- [产品路线图](ROADMAP.md)
