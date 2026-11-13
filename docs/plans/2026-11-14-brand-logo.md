# 品牌 Logo 重设计实施计划

**Goal:** 将用户选择的 A「标签成 T」同步到全部品牌资源与扩展。

**Architecture:** 保留现有 SVG、PNG 与 React 图标结构，以统一的三标签几何替换旧标识。品牌色与交互色分开，设置页两个品牌位共用品牌令牌。

**Tech Stack:** SVG、React / TypeScript、CSS、ImageMagick、Vitest。

**Spec:** [2026-11-14-brand-logo](../specs/2026-11-14-brand-logo.md)。

## 约束与检查重点

- 采用已选定的精确几何和十六进制颜色，所有尺寸一致。
- 保留 `currentColor`、128 viewBox、无描边的渲染契约。
- PNG 透明圆角和 16px 标签间隙必须可辨。
- 两种主题均使用相同品牌色；界面交互色保持原值。
- 不提交、不发布；直接在当前工作区交付修改。

## 步骤

- [x] 更新品牌规格和 Logo 展示页、五个 SVG 源文件。
- [x] 替换 React 品牌图形，更新设置页品牌砖颜色和旧测试断言。
- [x] 从 SVG 导出四档 PNG，核对尺寸、透明度与颜色，查看导出图。
- [x] 格式化改动文件，执行 `make check`、`pnpm build`，检查最终 diff。

## 验证结果

- `make check`：格式、lint、类型检查通过；38 个测试文件、276 项测试通过。
- `pnpm build`：通过。
- 四档 PNG 尺寸正确；128px 抽样确认透明圆角、暖橙底与奶油白图形；人工查看 128px 和 16px 导出图。
- 五个 SVG 与 React 几何一致，展示页资源链接有效；构建图标与源文件逐字节一致，manifest 引用正确。
