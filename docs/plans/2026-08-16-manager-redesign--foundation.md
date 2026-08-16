# 管理页重设计 · 子计划：foundation

- Implements: [spec §2, §4](../specs/2026-08-16-manager-redesign.md)
- Depends on: 无
- 目标：为两张页面提供共用地基——扩展后的 Settings 模型、主题机制、设计 token、SVG 图标库、新窗口辅助、扩展图标。本子计划结束时 UI 外观尚未改变（token 文件已就位但旧样式仍在用），一切既有测试保持绿。

## 步骤

1. **Settings 模型扩展**（`src/lib/storage.ts`）
   - `Settings` 增加 `theme: 'light'|'dark'|'auto'`（默认 `auto`）、`newWindowMode: 'max'|'same'`（默认 `max`）、`visibleTabs: 5|8|12|'all'`（默认 `8`）。
   - 旧数据无新字段 → 读取时经 `DEFAULT_SETTINGS` 合并兜底（现有 `useStorageState` fallback 语义确认覆盖部分字段缺失的情况，不够则补合并逻辑）。
   - → verify: storage 单测覆盖默认值与部分字段合并。
2. **主题机制**（新 `src/hooks/useTheme.ts` + 纯函数 `src/lib/theme.ts`）
   - `resolveTheme(pref, systemDark)` 纯函数；hook 负责：读 settings.theme → 设 `document.documentElement.dataset.theme`；`auto` 时监听 `prefers-color-scheme`；storage.onChanged 跨页同步（复用 useStorageState）。
   - → verify: resolveTheme 单测 + hook 测试（jsdom matchMedia mock）。
3. **token CSS**（新 `src/styles/tokens.css`，manager 与 settings 两入口共享 import）
   - 逐字迁移设计稿 `:root` / `html[data-theme="dark"]` 全量 token；加 body 基础排版规则（13px/1.7/字体栈/`.num`）与 `:focus-visible`、`prefers-reduced-motion` 全局规则。
   - → verify: 构建通过；此步不改组件类名。
4. **SVG 图标库**（新 `src/components/icons.tsx`）
   - 设计稿 `ICONS` 全套路径数据转为 React 组件（统一 1.7px 描边、currentColor、尺寸 prop）；含品牌 logo。
   - favicon 回退：新 `LetterBadge` 组件（域名首字符 + 由 hostname 派生的稳定背景色），供无 `favIconUrl` 的行使用。
   - → verify: 渲染单测（快照关键属性：stroke-width、viewBox）。
5. **新窗口辅助**（新 `src/lib/open-window.ts`）
   - `createWindowBySetting(mode, opts)`：`max` → create 后 `state:'maximized'`；`same` → 复制当前窗口几何（+40 偏移，沿用现有 moveTab 实现的做法）。供拆窗/稍后阅读/会话/新建窗口复用。
   - → verify: 单测（chrome mock 断言参数）。
6. **扩展图标**
   - 以品牌标记生成 `public/icons/{16,32,48,128}.png`（脚本或手工导出，深底浅标）；manifest 补 `icons` + `action.default_icon`。
   - → verify: `pnpm build` 后 dist 含图标；chrome 加载无告警。

## 验收

- `make check` 全绿；UI 行为与外观与改动前一致（token/图标尚未接线）。
- 新增纯函数与 hook 均有测试。
