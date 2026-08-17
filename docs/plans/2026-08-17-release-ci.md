# 实施计划：CI 与 Release 产物（发布自动化 阶段一）

Implements: [docs/specs/2026-08-17-release-automation.md](../specs/2026-08-17-release-automation.md)

## 目标

让仓库具备自动质量门禁与可分发产物：push/PR 自动跑 `make check`，打 tag 自动产出扩展 zip 并发布 GitHub Release。

## 范围

**在范围内**

- 版本单一来源：构建期由 `package.json` 注入 `dist/manifest.json`。
- `make package`：把 `dist/` 打成 `tab-station-<version>.zip`。
- `.github/workflows/ci.yml`、`.github/workflows/release.yml`。
- README 发布章节与 CLAUDE.md 结构索引更新。

**不在范围内**

- Chrome Web Store 自动上传（阶段二，被 extension ID 阻塞）。
- 自动 bump 版本、生成 changelog、多浏览器打包。

## 依赖

无。阶段二依赖本计划。

## 步骤

1. **移除 `public/manifest.json` 的 `version` 字段** → 验证：文件内不再出现 `version`。
2. **`vite.config.ts` 增加 manifest 版本注入插件** → 验证：`pnpm build` 后 `dist/manifest.json` 的 `version` 等于 `package.json` 的 `version`。
3. **`package.json` 增加 `packageManager` 字段**（与本地 pnpm 版本一致）→ 验证：`pnpm install` 正常。
4. **Makefile 增加 `package` target**，依赖 `build` → 验证：本地执行产出 zip，且 `unzip -l` 显示根目录直接是 `manifest.json`。
5. **`.gitignore` 忽略 zip 产物** → 验证：打包后 `git status` 干净。
6. **编写 `ci.yml`** → 验证：语法自检通过，步骤与本地 `make check` 等价。
7. **编写 `release.yml`** → 验证：语法自检通过；版本校验逻辑在不一致时退出非零。
8. **更新 README 与 CLAUDE.md** → 验证：链接可达，结构树含 `.github/`。
9. **全量 `make check`** → 验证：全绿。

## 验收标准

见 spec 的「验收标准」。其中第 1、3 条需要推送到 GitHub 后由真实流水线确认，本地只能验证第 2、4 条与配置语法。

## 备注

- Release 中重复执行 `make check` 是有意为之：tag 可能落在未经 CI 的提交上。
- 首次推送后需在仓库 Settings → Actions 确认 workflow 权限允许写 contents，否则 `gh release create` 会 403。
