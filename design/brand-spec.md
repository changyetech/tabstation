# Tab Station 品牌规格

暖纸白与可可棕构成浅深主题，陶橙交互色呼应「标签成 T」Logo，配合 1.7px monoline 图标和 swoosh + 纸屑反馈。
当前配色依据：[暖橙主题规格](../docs/specs/2026-11-14-warm-theme.md)；实现来源：`src/styles/tokens.css`。

## 核心令牌（Light / Dark）

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F8F5F0` | `#201B18` |
| `--surface` | `#FFFCF7` | `#2B2420` |
| `--fg` | `#33251F` | `#F5EBDD` |
| `--muted` | `#705E54` | `#C0AEA0` |
| `--border` | `#DFD2C6` | `#524238` |
| `--accent` | `#C4552D` | `#EF916B` |
| `--accent-strong` | `#AD401F` | `#F2A17C` |
| `--accent-hover` | `#923416` | `#FFB898` |
| `--accent-active` | `#7B2B12` | `#E58F67` |
| `--on-accent` | `#FFF7E8` | `#2B1C15` |
| `--accent-tint` | `#FBE9DD` | `#442D22` |
| `--hover` | `#F1E8DE` | `#382E28` |
| `--seg-bg` | `#EDE3D8` | `#251F1B` |

Logo 原色 `--brand: #ED693C` / `--on-brand: #FFF7E8` 在两种主题中保持一致。
交互色保留品牌色相，但为小字号文字和主按钮提高对比度。成功用绿、危险用玫瑰红、警告用琥珀色，数值见主题规格。
毛玻璃、卡片头渐变和阴影从暖色令牌派生；主题缩略图固定表示对应主题。

## 字体

- Display:`-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif`
- Body:`-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- Mono:仅数字场景,一律 `font-variant-numeric: tabular-nums`

## 观察到的规则

1. 低饱和暖中性色为主体；橙色用于主操作、模式选中、当前窗口、焦点和拖拽落点，避免整页大面积高饱和色。
2. 图标全部 1.7px 描边 monoline SVG(`currentColor`),不外链图片。
3. 14px 基准正文,CJK 行高 ≥1.7、标题 1.3–1.4;Latin display 负字距(−0.01~−0.03em),CJK 零字距。
4. hover 走背景位移(`--hover`)或边框/阴影,前景对比度只升不降;危险操作 hover 配 `--danger` + tint。
5. 交互签名：关闭类动作 = swoosh 音效 + 暖橙、杏色、鼠尾草绿、玫瑰、暖紫纸屑 + 退场动画；改动即时保存，toast 使用主题前景 / 背景反色反馈。

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
- Logo 品牌色保持原样，UI 交互 accent 使用同色系对比色阶；当前界面色值以 `src/styles/tokens.css` 为准。

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
