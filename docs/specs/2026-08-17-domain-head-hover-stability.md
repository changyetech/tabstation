# 全部模式：域名卡片头悬停不改变高度

- 日期：2026-08-17
- 状态：已实现
- 相关：`docs/specs/2026-08-16-manager-redesign.md`（全部模式 · 域名视图多列瀑布）

## 问题

全部模式（域名视图）下，鼠标悬停在域名卡片头（`.win-head`，含站点图标与域名标题）时，卡片整体高度从 40px 变为 41px；`.dom-flow` 是 CSS 多列瀑布（`columns`），任一卡片高度变化都会触发列平衡重算，导致其他卡片在列间跳位。

## 根因

- `.win-head` 静止态最高子元素是 `.win-meta`（11.5px × 1.7 ≈ 19.55px），加 8px 上下内边距与 1px 下边框仍不足 40px，由 `min-height: 40px` 兜底 → 40px。
- 悬停时 `.dom-acts` 由 `display: none` 变为 `display: flex`，其中 `.icon-btn` 高 24px。全局 `box-sizing: border-box`，故悬停态自然高度 = 24 + 8 + 8 + 1（下边框）= **41px** > `min-height`，卡片头被撑高 1px。

即：卡片头的静止高度低于其悬停态的自然高度，高度契约被悬停态破坏。

## 方案

域名卡片头收窄纵向内边距至 7px，使悬停态自然高度 24 + 7 + 7 + 1 = 39px ≤ 40px，两种状态均由 `min-height: 40px` 决定。`.win-head` 为 `align-items: center`，静止态内容垂直居中，观感与修复前一致。

同时把原本写在 `DomainGroupList.tsx` 的行内 `minHeight: 40` 收进同一条 CSS 规则，避免高度契约分散在两处。

```css
.dom-flow .win-head {
  min-height: 40px;
  padding-block: 7px;
}
```

窗口模式 / 会话卡片的 `.win-head` 用默认 `min-height: 44px`（24 + 16 + 1 = 41 ≤ 44），本就无此问题，不受影响。

## 验收标准

- 全部模式下悬停任一域名卡片头，卡片头与卡片总高度不变，其余卡片不发生位移。
- 静止态域名卡片头仍为 40px，图标 / 标题 / 计数的垂直位置不变。
- `@media (hover: none)` 下 `.dom-acts` 常驻，卡片头仍为 40px。
