# Tab Station 品牌规格(源:项目 `refs/design/brand-spec.md` + `src/styles/tokens.css`,逐字继承)

一句话:单色中性为主的 modern-minimal 操控台,唯一 accent 蓝每屏 ≤2 处,配 1.7px monoline 图标与 swoosh + 纸屑的俏皮交互签名。

## 核心令牌(OKLch,light / dark 成对)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `oklch(99% 0.002 240)` | `oklch(17% 0.008 250)` |
| `--surface` | `oklch(100% 0 0)` | `oklch(21% 0.01 250)` |
| `--fg` | `oklch(18% 0.012 250)` | `oklch(93% 0.005 250)` |
| `--muted` | `oklch(54% 0.012 250)` | `oklch(66% 0.01 250)` |
| `--border` | `oklch(92% 0.005 250)` | `oklch(100% 0 0 / .09)` |
| `--accent` | `oklch(58% 0.18 255)` | `oklch(70% 0.15 255)` |

派生:`--accent-strong`(文本级 ≥4.5:1)、`--accent-hover`、`--on-accent`、`--accent-tint`、`--hover`、`--seg-bg`、`--success/--danger/--warn` 各带 tint、`--frost`、`--block-shadow/--pop-shadow`。

## 字体

- Display:`-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif`
- Body:`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- Mono:仅数字场景,一律 `font-variant-numeric: tabular-nums`

## 观察到的规则

1. 单色中性占 70–90% 像素;accent 只出现在主 CTA(一键去重)与「当前窗口」标记,每屏 ≤2 处。
2. 图标全部 1.7px 描边 monoline SVG(`currentColor`),不外链图片。
3. 13px 基准正文,CJK 行高 ≥1.7、标题 1.3–1.4;Latin display 负字距(−0.01~−0.03em),CJK 零字距。
4. hover 走背景位移(`--hover`)或边框/阴影,前景对比度只升不降;危险操作 hover 配 `--danger` + tint。
5. 交互签名:关闭类动作 = swoosh 音效 + 纸屑粒子 + 退场动画;改动即时保存 + 深底 toast 反馈。

## Logo(本次新增)

- Mark:「进站的标签」—— 带 favicon 圆孔的标签形落在圆头站台杆上,合成 ⊥ / 字母 T 双关。
- 单一实色(accent 或 fg/white 单色),零渐变、零描边、零投影;16px 用去孔简化版。
