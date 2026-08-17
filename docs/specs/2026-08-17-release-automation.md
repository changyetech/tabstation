# 发布自动化（Release Automation）

> Design spec（descriptive）。写作日期 2026-08-17。

## 背景

Tab Station 目前没有任何 CI/CD：质量门禁靠开发者本地执行 `make check`，分发靠使用者自行 `pnpm build` 后加载 `dist/`。这带来三个问题：

1. **门禁不可信** —— 是否跑过 `make check` 无法从仓库侧验证，回归可以直接进 `main`。
2. **无可分发产物** —— 想试用扩展的人必须装 Node 与 pnpm 并自行构建。
3. **版本号三处手写** —— `package.json`、`public/manifest.json`、git tag 各写一次，必然漂移。

## 目标

- 每次 push / PR 自动执行与本地一致的质量门禁。
- 打 tag 即产出可直接加载的扩展 zip，挂在 GitHub Release 上。
- 版本号只有一个真实来源。

## 非目标

- 不做自动 bump 版本号或生成 changelog。版本由人决定，手动 bump 并提交。
- 不做多浏览器（Firefox / Edge）打包。

## 分期

发布链路分两个阶段，因为第二阶段被一个外部前置条件阻塞。

| 阶段 | 范围 | 前置条件 |
| --- | --- | --- |
| **一：CI + Release 产物** | 质量门禁 + tag 触发打包并发 GitHub Release | 无 |
| **二：Chrome Web Store 上架** | 调用 Web Store API 自动上传并提交审核 | 需先注册开发者账号（含一次性注册费）并**手动**上传首个版本以获得 extension ID |

Web Store API 只能更新已存在的 item，无法通过 API 创建，因此阶段二必须等人工完成首次上架。本 spec 的详细设计只覆盖阶段一；阶段二在拿到 extension ID 后另写。

## 阶段一设计

### 版本单一来源

`package.json` 的 `version` 是唯一真实来源。

- `public/manifest.json` **不再包含** `version` 字段。构建期由 Vite 插件读取 `package.json` 并写入 `dist/manifest.json`。因此 `dist/` 永远与 `package.json` 一致，`pnpm dev` 的 watch 构建同样生效。
- git tag 不是来源而是**断言**。Release 流水线校验 tag（去掉 `v` 前缀）与 `package.json` 的 `version` 严格相等，不等则直接失败。

这样「改版本」这件事只有一个动作：改 `package.json`，提交，打同名 tag。

> 副作用：`public/` 目录本身不再是合法的 MV3 扩展目录。这不影响任何现有流程——项目从来只加载 `dist/`。

### 打包

`make package` 在构建之后把 `dist/` 内容打成 `tab-station-<version>.zip`（zip 根目录直接是 `manifest.json`，不含 `dist/` 这一层——Chrome Web Store 与「加载已解压」都要求如此）。zip 产物不进版本库。

### 工作流

**`ci.yml`** —— 触发：push 到 `main`、针对 `main` 的 PR。

单 job：checkout → pnpm → Node（带 pnpm 缓存）→ `pnpm install --frozen-lockfile` → `make check` → `make build`。

`make check` 已经串起 fmt-check、lint、typecheck、test，与本地完全同一条命令，避免 CI 和本地门禁漂移。末尾追加 `make build` 是为了保证产物真的能构建出来（`make check` 里的 typecheck 不覆盖 Vite 打包失败）。

**`release.yml`** —— 触发：push tag `v*`。

单 job：checkout → 校验 tag 与 `package.json` 版本一致 → pnpm / Node → 安装依赖 → `make check` → `make package` → `gh release create` 上传 zip。

设计要点：

- **Release 里重跑 `make check`**：tag 可能打在未经 CI 的提交上，不能假设已验证。
- **`permissions: contents: write`**：创建 Release 所需的最小权限，其余默认只读。
- **`--generate-notes`**：让 GitHub 依据提交自动生成说明，不引入额外 changelog 工具。
- **预发布识别**：tag 含 `-`（如 `v0.2.0-beta.1`）时标记为 prerelease。

### 环境固定

Node 24 + pnpm 经 `packageManager` 字段固定。`package.json` 增加 `packageManager` 字段，让 `pnpm/action-setup` 与本地取同一版本，避免 lockfile 兼容性问题。

## 验收标准

1. PR 上出现 CI 检查；故意破坏格式或测试时 CI 变红。
2. `pnpm build` 后 `dist/manifest.json` 的 `version` 等于 `package.json` 的 `version`。
3. 打 `v<version>` tag 后，Release 页面出现 `tab-station-<version>.zip`，解压加载到 Chrome 可正常运行。
4. tag 与 `package.json` 版本不一致时，Release 流水线在第一步失败且不产出 Release。

## 相关文档

- 实施计划：[2026-08-17-release-ci.md](../plans/2026-08-17-release-ci.md)
- [本地调试手册](../local-debugging.md)
