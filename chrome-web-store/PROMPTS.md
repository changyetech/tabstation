# 商店素材制作提示词

整理日期：2026-11-14。用于后续重新制作 Tab Station 商店素材。以下是根据本次需求和制作过程整理的可复用任务提示词；不是图片或视频模型调用日志。本次宣传图使用现有 SVG 标识与 HTML 排版渲染，功能视频使用真实扩展操作画面。

规格以 [上架资料第 8 节](../docs/chrome-web-store-listing.md#8-官方图片与宣传视频要求-graphic-assets-and-promotional-video) 为准，品牌以 [品牌规格](../design/brand-spec.md) 和 [命名约定](../docs/naming.md) 为准。产品功能、文案和配色应在每次制作时重新核实当前代码，不照搬旧版本画面。

## 1. 一次完成全部素材

复制下面的提示词，可以重新执行整套制作任务：

```text
请按 docs/chrome-web-store-listing.md 第 8 节，为当前版本的 Tab Station 制作完整的 Chrome 网上应用店素材，并保存到 chrome-web-store/。

先读取仓库 AGENTS.md、CONTEXT.md、docs/naming.md、design/brand-spec.md 和上架资料，核实当前版本、真实界面、功能文案及已有品牌资源。保留无关改动，不修改产品功能来配合拍摄。

交付内容：
1. 简体中文功能截图 5 张、英文功能截图 5 张，全部为 1280×800 PNG。
2. 英文小宣传图 1 张，440×280 PNG。
3. 英文横幅宣传图 1 张，1400×560 PNG；与小宣传图分别构图，不拉伸套用。
4. 英文宣传视频 1 个：16:9、1920×1080、30 fps，约 30～60 秒，MP4，英文画内字幕及独立 SRT。优先自动录制实际扩展功能，不使用生成式视频重绘产品界面。默认无配音、无音乐。
5. 说明各文件用途和上传顺序的 README。

截图依次展示：全部模式总览、窗口管理、搜索与去重预览、稍后阅读、已保存窗口。两种语言都必须使用真实的对应语言界面和匹配的演示数据，不能只翻译画面上的少量文字。

使用独立测试浏览器配置文件和演示数据，不操作日常浏览器或真实用户标签页。截图可使用当前管理页代码配合独立 Chrome API 演示环境；功能录屏优先加载当前构建的实际扩展，执行真实 Chrome API 操作。准确说明采用了哪种方式，不把模拟画面说成实际功能实录。

品牌沿用现有橙色“标签成 T”标识、暖纸白和可可棕配色。优先复用仓库 SVG 标识和可编辑排版，不重新生成或改变 Logo。宣传图少文字、强调品牌与标签整理的图形表达，不添加产品不存在的功能、排行榜、推荐徽章或评分。

视频包含扩展入口或快捷键打开、全部模式与窗口模式、搜索、去重预览及执行、稍后阅读保存及打开、保存窗口及恢复。若环境允许，实际触发快捷键并验证管理页已打开或被聚焦；若不允许，只展示真实设置和快捷键说明，并明确标注没有录到按键触发。

成品不得宣称零网络请求、云同步、AI 摘要或其他未经当前实现支持的能力。数据本地保存的表述须与上架资料一致。

完成后逐项核对尺寸、语言、文字、画面裁切、操作反馈、视频编码及字幕时间。更新素材说明与上架资料入口，提供最终文件链接。只生成本地素材，不上传 YouTube、不提交商店、不发布。
```

## 2. 单独更新中英文截图

```text
请使用当前版本的 Tab Station 管理页，为简体中文和英文商店页面各制作 5 张功能截图。

规格：每张 1280×800 PNG，直角、画面铺满、不加外围留白、衬边、宣传标题或浏览器外壳。保留产品界面自身的留白和圆角。文字清晰，不裁掉核心操作或提示。

使用两组浏览器窗口、若干常见站点的演示标签页、至少两组重复 URL、一个固定标签，以及稍后阅读和已保存窗口数据。不包含真实用户数据。演示数据数量以能在固定画面中完整展示功能为准；计数必须由数据真实计算。

两种语言均按以下顺序拍摄，语言切换后同步更新演示标题与已保存窗口名称：
01-all-tabs.png：浅色主题，全部模式，展示跨窗口按域名聚合及统计。
02-window-management.png：深色主题，窗口模式，展示两个窗口、固定标签与窗口操作。
03-search-dedupe.png：浅色主题，搜索 Chrome 相关标签页，悬停去重按钮，展示将保留和关闭的条目。
04-read-later.png：浅色主题，展示稍后阅读清单，悬停新窗口打开按钮，显示打开后从清单移除的实际提示。
05-saved-windows.png：深色主题，已保存窗口模式，展示有明确名称、可恢复的浏览任务。

保存到 chrome-web-store/zh_CN/ 和 chrome-web-store/en/。使用真实界面渲染，不生成或手绘界面。核对每张图的尺寸、语言、文字和完整性。
```

## 3. 单独更新英文小宣传图

```text
为 Tab Station 制作 Chrome 网上应用店英文小宣传图，输出 440×280 PNG，并保留可编辑的排版源文件。

先读取 design/brand-spec.md，直接复用 design/assets/logo/tab-station-mark.svg，保持三个圆角标签构成 T 的几何、比例与品牌色，不旋转、拉伸、加描边或改造 Logo。

画面铺满，采用可可棕背景、暖橙重点色、奶油白文字。左上方放品牌标识和 Tab Station 字标；左侧安排简短主文案，右侧用少量抽象标签卡片表达有序整理。缩小到一半仍能辨认品牌与主文案，不用实际界面截图铺满宣传图。

英文文字逐字使用：
Tab Station
Your tabs.
In your hands.
Find. Arrange. Resume.

画面简洁，文字与图形不重叠，不出现评分、排名、推荐徽章或未实现功能。优先使用现有 SVG 与 HTML/CSS 排版渲染，保证文字精确、尺寸准确。

保存为 chrome-web-store/promo/small-promo-en.png，并保存对应 HTML 源文件。
```

## 4. 单独更新英文横幅

```text
为 Tab Station 制作 Chrome 网上应用店英文横幅宣传图，输出 1400×560 PNG，并保留可编辑的排版源文件。请为横幅单独排版，不把 440×280 小宣传图直接拉伸或裁切。

先读取 design/brand-spec.md，直接复用既有“标签成 T”SVG 标识，保持 Logo 几何、比例、颜色及清空区。

沿用可可棕背景、暖橙重点色、奶油白文字。左侧为品牌、两行大标题、简短说明及三个功能标签；右侧用抽象的浏览器标签卡片阵列表达整理与编组，图形不冒充产品界面。保持充足的阅读空间与文字对比度。

英文文字逐字使用：
Tab Station
Your tabs.
In your hands.
Find, rearrange, and restore.
One workspace for your browser tabs.
Search
Rearrange
Save & restore

不出现中文、评分、排名、推荐徽章、云同步或 AI 等未实现能力。优先使用现有 SVG 与 HTML/CSS 排版渲染。

保存为 chrome-web-store/promo/marquee-promo-en.png，并保存对应 HTML 源文件。
```

## 5. 单独更新英文功能视频

```text
请为当前版本的 Tab Station 自动录制英文宣传视频，展示实际功能使用以及扩展入口或快捷键打开管理页。

交付：16:9、1920×1080、30 fps、约 30～60 秒，H.264 / yuv420p MP4；需要音轨时使用 AAC 静音轨。英文字幕直接合成进画面，另交付时间匹配的 SRT。默认无配音、无音乐。

在独立 Chrome 配置文件中加载当前构建的真实扩展，使用演示标签页和预置的稍后阅读、已保存窗口数据，不触碰日常浏览器和用户数据。记录真实操作前后状态，不把静态图轮播、模拟点击或模型生成画面描述成实际功能录屏。

按以下顺序演示：
1. 从普通演示页面，通过扩展图标入口或真实快捷键打开管理页；验证管理页确实创建或已有管理页被聚焦。
2. 展示实际快捷键配置：macOS 为 Command+Shift+E；Windows/Linux 为 Ctrl+Shift+E。优先以 chrome.commands.getAll() 的实际结果为准，若配置已改变则采用实际值。
3. 展示全部模式，并切换窗口模式查看不同窗口的真实标签页。
4. 搜索标题或 URL，显示匹配结果。
5. 悬停去重按钮，停留展示保留和关闭预览，再执行去重，确认统计变化。
6. 将一个非固定的网页标签收进稍后阅读，展示源标签关闭和待读数量增加。
7. 打开一个稍后阅读条目，确认从清单移除；返回管理页继续展示。
8. 保存一个窗口，切换已保存窗口模式，再恢复一个快照；确认新窗口创建且快照仍保留。
9. 以现有英文品牌宣传画面结尾。

每个主要场景停留约 2～4 秒，操作目标清楚可辨。保持画面比例，避免标题或字幕遮挡核心操作，字幕与操作结果同步。

快捷键必须区分“实际按键触发”和“快捷键设置说明”。系统权限或录制环境不允许真实发送按键时，不伪造成功；改为展示真实设置，并在交付说明中明确未录到按键触发。Chrome Extensions.triggerAction 可用于执行真实扩展图标 action，但不得称其为键盘快捷键触发。

输出到 chrome-web-store/video/tab-station-promo-en.mp4 与 tab-station-promo-en.srt。验证完整解码、比例、时长、编码、字幕同步及实际操作结果。说明录制条件和未覆盖部分，不上传 YouTube、不发布商店。
```

### 本次约 41 秒版本的英文字幕参考

时间仅对应本次版本；下次录制后按实际画面重新对齐，不强制套用旧时间。

| 时间 | 标题 | 说明 |
| --- | --- | --- |
| 00–02 s | Open with the extension icon | Click Tab Station in Chrome to open your manager. |
| 02–04 s | Your manager opens in one step | One place to organize your real browser tabs. |
| 04–08 s | A shortcut to your workspace | Click the extension icon · Mac: ⌘⇧E · Windows / Linux: Ctrl+Shift+E |
| 08–11 s | All your tabs. One workspace. | Tab Station — organize the tabs you actually use. |
| 11–14 s | See every window | Manage real tabs across browser windows. |
| 14–17 s | Find it instantly | Search open tabs by title or URL. |
| 17–20 s | Preview before you clean up | See which duplicate tabs will stay or close. |
| 20–23 s | Remove duplicate tabs | Pinned tabs take priority. |
| 23–26 s | Save a page for later | Read later saves the page and closes its source tab. |
| 26–29 s | Pick up where you left off | Opening a Read later item removes it from the list. |
| 29–32 s | Save a browsing task | Keep a window snapshot for future use. |
| 32–35 s | Restore your workspace | Saved windows can be reused. |
| 35–38 s | Restore again whenever you need | Restoring a window keeps its saved snapshot. |
| 38–41 s | Your tabs. In your hands. | Tab Station — find, rearrange, and restore. |

## 6. 交付验收提示词

```text
请复核 chrome-web-store/ 中本轮交付的素材：

- 中英文各 5 张截图，尺寸均为 1280×800，文件顺序与场景对应，使用正确语言，核心控件、文字和提示未被裁切。
- 小宣传图 440×280、横幅 1400×560，均为 PNG，分别构图；Logo 与品牌规格一致，英文拼写准确，缩小一半仍可辨识。
- 视频为 16:9、1920×1080、30 fps，实际时长约 30～60 秒，H.264 / yuv420p，可完整解码；英文画内字幕和 SRT 与操作画面同步。
- 用录制前后的标签数、待读数量、窗口数和快照是否保留等状态变化，核实所展示操作真正执行。
- 快捷键触发、扩展 action 和设置说明的描述符合实际证据，不混用。
- 不包含用户真实标签页、个人信息、未实现功能或“零网络请求”等不准确承诺。
- 交付包含对应语言截图、宣传图、视频、字幕及 README，文件链接按当前目录结构可用。
- README 写明上传顺序、演示数据来源、录制方式及限制。商店视频位需要 YouTube 链接，本地 MP4 不等于已经提交视频。

完成后提供最终文件链接，并明确尚未完成的项目；不要仅凭文件存在就宣称全部验收通过。
```

## 7. 本次执行经验

- 素材当前位于仓库根目录 `chrome-web-store/`。不要沿用之前的 `screenshots/chrome-web-store/` 路径。
- 本次宣传图沿用现有品牌 SVG，通过 HTML 排版渲染；不需要让生成式模型重画 Logo 或产品界面。
- 本次真实扩展录制使用独立 Chrome。浏览器级调试接口的 `Extensions.loadUnpacked` 用于加载构建产物；`Extensions.triggerAction` 要求 tab target，不能直接传 page target。下次先核实当前浏览器与工具支持情况。
- 无头 Chrome 中模拟按键没有触发本次快捷键入口，操作系统辅助功能权限也未授予。因此成片仅展示真实快捷键设置，不声称录到按键触发。
- 本次确认稍后阅读保存后条目数从 4 变为 5，恢复已保存窗口后窗口数从 2 变为 3。这些数值仅是本次演示结果，不是以后验收必须硬编码的固定值。
- 本文保存任务提示词与制作经验，不是可直接运行的录制脚本；临时构建、浏览器配置与调试路径不应成为后续制作的前提。
