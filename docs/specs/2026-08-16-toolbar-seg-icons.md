# 图标对齐设计系统 + 模式段控图标（Icon Family Refresh & Toolbar Segment Icons）

- 日期：2026-08-16
- 状态：已实现
- 依据：`design/tab-station-design-system.html`「图标」区块（20×20 视窗、1.7px 描边、圆头圆角、currentColor）
- 范围：`src/components/icons.tsx`、`src/components/Toolbar.tsx`、`src/manager/styles.css` 及测试

## 1. 目标

1. 管理页控制条三段模式按钮（窗口模式 / 全部模式 / 已保存会话）从纯文字改为图标 + 文字，与右侧「一键去重」的图文风格一致。
2. 「窗口模式」「全部模式」「会话」「拆到新窗口」「移动到」五枚图标按设计系统稿的 20 视窗图标族替换——此前代码用的是旧 home 稿 24 视窗的窗口系图形。

## 2. 图标映射（glyph 逐字取自设计系统稿）

| 语义 | 代码名 | 图形 |
|---|---|---|
| 窗口模式 | `win` | 窗口框 + 工具条线 + 标签分隔（也用于 MoveMenu 窗口列表） |
| 全部模式 | `globe` | 地球——全浏览器范围 |
| 会话 | `session` | 快照层叠 |
| 拆到新窗口 | `winNew` | 左窗 + 右侧新窗 + 箭头（沿用于所有「新窗口打开」按钮） |
| 移动到 | `move` | 左右窗口括弧 + 中线 |

实现上 `icons.tsx` 分两族：新五枚在 `STROKE_PATHS_20`（viewBox 20），其余仍为 24 视窗；描边统一 1.7px。不在上述清单内的图标（close、pin、trash、save、bookClock 等）本次不动。

## 3. 布局

`.seg` 为 `inline-flex` + `gap 6px`（与 `.btn-dedupe` 一致），段控图标尺寸 13px，文案不变。

## 4. 验收

- `icons.test.tsx`：`win` / `winNew` / `move` / `globe` / `session` 输出 20 viewBox、1.7px 描边、非空内容。
- `Toolbar.test.tsx`：三段按钮各含一枚 svg 图标，文案与回调行为不变。
