# 本地调试手册（Local Debugging）

> 面向开发者的 MV3 扩展本地调试指南。构建方式为 `vite build --watch`（产物型 watch，非 dev server），入口为 manager 页面、settings 页面与 background service worker。

## 日常调试流程

### 1. 起 watch 构建

```bash
make dev   # 即 pnpm dev → vite build --watch，改代码自动重建 dist/
```

### 2. 加载扩展（只需一次）

打开 `chrome://extensions` → 开启右上角「开发者模式」→「加载已解压的扩展程序」→ 选 `dist/` 目录。

### 3. 改代码后的刷新规则

MV3 调试的关键认知——不同入口的刷新方式不同：

| 改了什么 | 需要做什么 |
|---|---|
| manager / settings 页面（React/UI） | 直接刷新对应标签页（⌘R）即可，watch 已重建产物 |
| `background.ts` | 必须回 `chrome://extensions` 点扩展卡片上的 ↻ 刷新按钮 |
| `manifest.json` / `_locales` | 同样点 ↻；改权限时偶尔需要移除重装 |

### 4. 两个独立的 DevTools 界面

- **Manager 页面**：普通页面，直接 F12。React 调试可装 React DevTools 扩展（对 `chrome-extension://` 页面同样生效）。
- **Service Worker**：在 `chrome://extensions` 扩展卡片上点「服务工作进程」（Service worker）链接，弹出专属 DevTools。
  - MV3 的 SW **空闲约 30 秒会被杀掉**，日志随之丢失。
  - 该 DevTools 窗口开着时 SW 会被保活，调试期间很方便。
  - 反之，**测试休眠相关 bug 时要关掉它**，否则永远复现不了「SW 冷启动」路径。

## 提速建议

- **单独的 Chrome 调试 profile**：避免污染日常浏览器，也避免其他扩展干扰 `tabs.query` 的结果。

  ```bash
  open -na "Google Chrome" --args --user-data-dir=/tmp/tabstage-profile
  ```

- **逻辑层优先走 Vitest**：项目已配好 vitest + jsdom，纯逻辑（如 `src/lib/effects/`）的调试用 `pnpm test:watch` 比在浏览器里手点快一个数量级，符合项目 TDD 约定。浏览器只用来验收真实 `chrome.*` API 行为。
- **快捷键验证**：manifest 配了 ⌘⇧E（Windows/Linux 为 Ctrl+Shift+E）打开 manager；若不生效，去 `chrome://extensions/shortcuts` 检查是否被占用。

## 可选升级：真 HMR

若「改 UI → 手动刷新页面」成为瓶颈，可引入 [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin)：为 MV3 扩展提供真正的 HMR（UI 改动免刷新）与 background 自动 reload。

代价：构建配置需围绕它重写（manifest 由插件接管），且该插件目前为社区维护状态。以当前项目体量，建议**先不上**——`vite build --watch` + 手动刷新的心智负担很小；等 UI 迭代密度明显上来再评估。
