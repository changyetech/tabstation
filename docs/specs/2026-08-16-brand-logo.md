# 品牌 Logo 落地（Brand Logo）

- 日期：2026-08-16
- 状态：已实现
- 依据：`design/brand-spec.md`（品牌规格）、`design/tab-station-logo.html`（Logo 提案）
- 范围：`public/icons/*.png`、`src/components/icons.tsx`（`logo` 图标）及测试

## 1. 目标

按最新品牌规范落地 Tab Station 标识「进站的标签」：带 favicon 圆孔的标签形落在圆头站台杆上，合成 ⊥ / 字母 T 双关。替换扩展图标与应用内品牌位的旧「窗口」图形。

## 2. 图形规范（摘自 brand-spec）

- 128 网格：标签体 34×52（顶部圆角 r10）、站台杆 76×12（全圆头 r6）、favicon 孔 r7。
- 单一实色（accent / fg / 白 三选一），零渐变、零描边、零投影。
- **≤16px 用去孔简化版**（孔糊成噪点）：去孔、站台加粗至 16、标签放宽 18×50。这是唯一允许的图形改动。
- App 图标砖：圆角 r28（约 22%），accent 底 `oklch(58% 0.18 255)`（= `#1778E1`）+ 白 mark。

## 3. 落地点

| 位置 | 内容 |
|---|---|
| `public/icons/{128,48,32}.png` | 由 `design/assets/logo/tab-station-app-icon.svg` 渲染（accent 砖 + 白 mark，孔透底色） |
| `public/icons/16.png` | 由 `design/assets/logo/tab-station-favicon-16.svg` 渲染（去孔简化版） |
| `src/components/icons.tsx` `logo` | 旧「窗口」描边图形 → 实心 mark 路径（`currentColor`、viewBox 128）；`size <= 16` 自动切去孔简化路径 |

`logo` 引用点（设置页顶栏 15px、关于区 22px）无需改动——15px 自动走简化版。管理页无品牌位。色彩令牌已与规范一致（规范逐字继承 `src/styles/tokens.css`），不涉及改动。

## 4. 验收

- `icons.test.tsx`：logo 为实心填充、128 viewBox、无描边；>16px 含 favicon 孔（路径含 `a7 7` 圆弧），≤16px 不含。
- `public/icons/` 四张 PNG 尺寸正确、圆角外透明、孔位透出 accent 底色。
