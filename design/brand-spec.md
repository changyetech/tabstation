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

## Logo（2026-11-14 重设计）

采用用户选定的 A「标签成 T」，替代原蓝色「进站的标签」。[设计规格](../docs/specs/2026-11-14-brand-logo.md)记录范围与验收。

- Mark：三个独立的圆角标签构成 T，表达多个标签在工作站内被操作、编组。
- 128 网格：左 `(24,30,22,28)`、中 `(53,30,22,68)`、右 `(82,30,22,28)`；圆角均为 6。
- 品牌暖橙 `#ED693C`（`--brand`）、奶油白 `#FFF7E8`（`--on-brand`）、字标深棕 `#422A20`。
- App 图标砖：128 × 128、圆角 28，暖橙底、奶油白 mark。16 / 32 / 48 / 128px 保持同一几何，无另行简化。
- 设置页的 26px / 40px 品牌砖：图形填满 SVG 画布，由图形自身留白；圆角 22%，浅深主题品牌色相同。
- 彩色 mark 使用品牌暖橙；单色版继承 `currentColor`，可用前景色或奶油白适配背景。
- 横版字标：`Tab Station`，系统无衬线 600 字重、52px、字距 −1px；SVG 宽 460，高 128，字标起点 `(128,83)`。
- 保持三个标签的间隙与比例；图形四周清空区至少 12 个网格单位。禁用孔洞、渐变、描边、投影、旋转或拉伸。
- 品牌色独立于上文 UI 交互 accent；上文令牌表为初版设计快照，当前界面色值以 `src/styles/tokens.css` 为准。

### 资产与导出

- `assets/logo/tab-station-app-icon.svg`：四档扩展 PNG 的主源文件。
- `assets/logo/tab-station-favicon-16.svg`：保留已有资源入口，几何与 App 图标一致。
- `assets/logo/tab-station-mark.svg` / `tab-station-mark-mono.svg`：彩色 / 单色 mark。
- `assets/logo/tab-station-logo-horizontal.svg`：README 与宣传横版字标。
- `tab-station-logo.html`：品牌展示与尺寸检查。

使用 ImageMagick 从 SVG 直接渲染、透明背景、高分辨率采样后缩放到目标尺寸：

```sh
magick -background none -density 384 design/assets/logo/tab-station-app-icon.svg -resize 16x16 PNG32:public/icons/16.png
```

其余尺寸将 `16` 分别替换为 `32`、`48`、`128`。导出后核对尺寸、透明圆角与品牌像素。
