# Tab Station Chrome 网上应用店上架填写资料

适用版本：0.3.0。核对日期：2026-11-14。

本文提供商店文案、权限说明、数据使用声明、审核说明、建议选项与商店素材要求，中英文可分别复制到对应语言的字段。隐私政策正文与开发者账号资料不包含在本文中，截图文件单独保存。字段名称可能随后台语言和界面更新略有不同，按字段含义对应填写。

简体中文与英文各 5 张功能截图、英文小宣传图、英文横幅宣传图及英文 16:9 宣传视频已整理在 [商店素材目录](../chrome-web-store/README.md)。截图均为 1280 × 800 PNG，按编号上传对应语言页面；视频需先上传 YouTube 后填写链接。

**当前行为边界**：数据处理和持久化在本机完成，没有开发者后端、分析或广告服务；当前版本会直接加载网站提供的图标 URL，可能向对应图标服务器发起图片请求。因此本文不使用“零网络请求”或“绝不向任何第三方发送请求”的表述。网站图标属于图片资源，不属于远程可执行代码。

## 1 商店基本信息 Store listing

| 后台字段 Field | 中文填写或选择 | English value or selection |
| --- | --- | --- |
| 类型 Type | 扩展程序 | Extension |
| 名称 Name | 当前安装包名称为 `Tab Station`，由 manifest 本地化消息提供 | The current package name is `Tab Station`, supplied by the localized manifest message |
| 分类 Category | 功能与界面，以英文选项核对 | Functionality & UI |
| 默认语言 Default language | 英语，与 manifest 的 `default_locale: en` 一致 | English |
| 中文商店页面 Locale | 中文（简体） | Chinese (Simplified), `zh_CN` |
| 英文商店页面 Locale | 英语 | English, `en` |
| 官网 Homepage URL | 建议 `https://tabstation.omnikit.run`，确认页面已公开可用后填写 | Suggested: `https://tabstation.omnikit.run`; use after confirming the site is publicly available |
| 支持链接 Support URL | 可选；没有独立支持页面时留空 | Optional; leave blank if no dedicated support page is available |
| 官方网址 Official URL | 可选；仅在后台已验证网站所有权后选择 | Optional; select only after verifying site ownership in the dashboard |

官方分类说明明确将标签管理器归入 `Functionality & UI`。扩展还支持法语、日语、韩语、俄语；本次提供英语与简体中文两套商店文案。

### 1.1 名称与简短介绍

名称和简短介绍由上传包的 manifest 及 `_locales/*/messages.json` 提供；后台不能编辑时，需要修改本地化消息后重新构建上传。以下是上架文案目标，不表示代码已修改。

按 [产品命名约定](naming.md)，商店名称使用：

中文：

```text
Tab Station — 标签工作站
```

English:

```text
Tab Station — Manage & Rearrange All Your Tabs
```

当前安装包两种语言的名称均为 `Tab Station`。采用上述商店名称前，需要同步对应 manifest 本地化消息，并确认浏览器内显示名称也符合预期。

建议简短介绍，均少于 132 字符：

中文：

```text
集中管理所有窗口的标签页：搜索、拖拽排序、去重、稍后阅读与已保存窗口，数据保存在本机。
```

English:

```text
Manage tabs across windows: search, rearrange, remove duplicates, save for later, and restore saved windows. Data stays local.
```

### 1.2 详细介绍 中文

```text
Tab Station（标签工作站）将所有窗口的标签页集中到一个管理页，帮助你查找、整理、暂存并恢复浏览任务。

直接管理真实标签页
查看所有窗口的标签页，点击即可切换。拖拽排序、跨窗口移动、拆到新窗口和关闭操作会直接作用于浏览器中的真实标签页。

三种模式，按需整理
全部模式：跨窗口按域名聚合标签页。
窗口模式：按浏览器窗口查看标签页及其顺序。
已保存窗口：保存常用浏览任务，之后按需恢复。

搜索与快速定位
按标题或 URL 查找标签页。在 Chrome 地址栏输入 ts 后按 Tab，再输入关键词，可搜索打开的标签页、稍后阅读与已保存窗口。

清理重复标签页
识别重复 URL，预览将保留和关闭的条目，再执行去重。去重优先保留固定标签。

稍后阅读
把暂时不看的页面收进稍后阅读，同时关闭源标签页。之后打开条目时，会自动从清单移除。

可反复恢复的已保存窗口
将窗口保存为快照，支持重命名、条目排序、单条打开和删除。恢复后仍保留快照，可再次使用。

本地数据与清晰的权限用途
扩展读取标签页标题、URL、站点图标及窗口信息，用于展示、搜索和整理浏览任务。设置、稍后阅读和已保存窗口保存在本机的 Chrome 扩展存储中，不上传到开发者服务器。扩展没有账号登录、广告或分析服务。显示网站图标时，可能向对应图标服务器请求图片。

提供浅色、深色及跟随系统主题，界面支持简体中文、英语、法语、日语、韩语和俄语。

点击扩展图标即可打开管理页，也可使用默认快捷键：Windows/Linux 为 Ctrl+Shift+E，macOS 为 Command+Shift+E。快捷键可在 Chrome 的扩展程序快捷键设置中调整。Tab Station 不替换浏览器的新标签页。

请注意：管理页操作会影响真实标签页；关闭与去重前请先确认正在编辑的内容已经保存。
```

### 1.3 Detailed description English

```text
Tab Station brings tabs from all your windows into one manager page, helping you find, organize, set aside, and restore your browsing tasks.

Manage your actual browser tabs
View tabs across windows and click to switch to them. Drag to rearrange tabs, move them between windows, split them into a new window, or close them. Your changes apply directly to the actual tabs in Chrome.

Three ways to organize
All Tabs: group tabs by domain across windows.
By Window: view tabs in their browser windows and existing order.
Saved Windows: save browsing tasks and restore them when needed.

Find tabs quickly
Search open tabs by title or URL. In the Chrome address bar, type ts, press Tab, and enter a keyword to search open tabs, Read Later items, and Saved Windows.

Remove duplicate tabs
Identify duplicate URLs, preview which tabs will be kept or closed, and remove duplicates. Pinned tabs take priority when choosing what to keep.

Read Later
Set a page aside and close its original tab. Opening it from Read Later automatically removes it from the list.

Reusable Saved Windows
Save a window as a snapshot. Rename it, rearrange its items, open individual pages, or remove items. Restoring a Saved Window keeps the snapshot available for future use.

Local data and clear permission use
The extension reads tab titles, URLs, site icons, and window information to display, search, and organize browsing tasks. Settings, Read Later items, and Saved Windows are stored locally in Chrome extension storage and are not uploaded to developer servers. There is no account login, advertising, or analytics service. Displaying site icons may request images from the corresponding icon servers.

Choose a light, dark, or system theme. The interface supports English, Simplified Chinese, French, Japanese, Korean, and Russian.

Click the extension icon to open the manager page, or use the default shortcut: Ctrl+Shift+E on Windows/Linux or Command+Shift+E on macOS. Shortcuts can be changed in Chrome's extension shortcut settings. Tab Station does not replace your new tab page.

Please note: actions in the manager affect your actual browser tabs. Save any work in progress before closing tabs or removing duplicates.
```

## 2 单一用途 Single purpose

字段：`Single purpose description`。该字段只填一套语言即可，推荐英文；两种版本含义一致。

中文：

```text
在一个管理页集中整理 Chrome 标签页：搜索、排序、跨窗口移动、关闭重复标签页，以及将浏览任务暂存为稍后阅读或已保存窗口并在之后恢复。所有功能均服务于标签页和浏览任务管理。
```

English:

```text
Organize Chrome tabs from one manager page: search, rearrange, move tabs between windows, close duplicates, and set browsing tasks aside as Read Later items or Saved Windows for later use. All features serve the single purpose of managing tabs and browsing tasks.
```

## 3 权限用途 Permission justifications

当前 manifest 仅声明 `tabs`、`storage`、`favicon`，没有 `host_permissions` 或可选权限。后台按上传包自动列出权限；每项复制对应说明即可。`omnibox` 是 manifest 功能配置，不是第四项权限；若有相关补充说明字段，可使用本节末尾的说明。

### 3.1 tabs

中文：

```text
读取打开标签页的标题、URL 和站点图标信息，以在管理页展示标签页、按标题或 URL 搜索、按域名分组、识别重复 URL，以及保存稍后阅读和窗口快照。这些数据也用于 ts 地址栏搜索建议。读取的数据在本机处理，不上传到开发者服务器。
```

English:

```text
Read the titles, URLs, and favicon information of open tabs to display tabs in the manager, search by title or URL, group tabs by domain, identify duplicate URLs, and save Read Later items and window snapshots. The same data supports ts address-bar search suggestions. This data is processed locally and is not uploaded to developer servers.
```

### 3.2 storage

中文：

```text
使用 chrome.storage.local 在本机保存用户设置、稍后阅读条目和已保存窗口，包括相关标题、URL、图标地址、保存时间、窗口名称及固定标签状态。用于在关闭和重新打开浏览器后继续使用这些数据，不使用云同步或开发者服务器存储。
```

English:

```text
Use chrome.storage.local to persist settings, Read Later items, and Saved Windows on the user's device, including the relevant titles, URLs, favicon URLs, saved timestamps, window names, and pinned-tab states. This keeps those features available across browser restarts without cloud sync or developer-server storage.
```

### 3.3 favicon

中文：

```text
通过扩展的 _favicon/ 接口获取 Chrome 保存的网站图标，用于在标签页列表、域名分组、窗口卡片、稍后阅读和已保存窗口中识别网站。当前版本在网站提供的图标地址缺失或加载失败时使用此接口回退。此权限仅用于站点图标展示。
```

English:

```text
Access site icons through the extension's _favicon/ endpoint to identify websites in tab lists, domain groups, window cards, Read Later, and Saved Windows. The current version uses this endpoint as a fallback when a site's supplied favicon URL is missing or fails to load. This permission is used only to display site icons.
```

### 3.4 地址栏功能补充 Omnibox explanation

中文：

```text
用户在 Chrome 地址栏输入 ts 并按 Tab 后，可搜索本机打开的标签页、稍后阅读和已保存窗口。关键词只用于本地匹配，不发送到搜索引擎或开发者服务器。选择结果可切换标签页、打开稍后阅读条目或恢复已保存窗口。
```

English:

```text
After typing ts and pressing Tab in Chrome's address bar, the user can search locally available open tabs, Read Later items, and Saved Windows. Search terms are matched locally and are not sent to a search engine or developer server. Selecting a result switches to a tab, opens a Read Later item, or restores a Saved Window.
```

## 4 远程代码 Remote code

建议选项：**否，我未使用远程代码 / No, I am not using remote code**。

若后台要求说明：

中文：

```text
所有 JavaScript、界面样式和语言资源随扩展安装包提供。不从远程服务器加载或执行 JavaScript、WebAssembly 或其他可执行代码。网站图标可能通过远程图片 URL 加载，仅作为图片展示，不作为代码执行。
```

English:

```text
All JavaScript, UI styles, and language resources are included in the extension package. The extension does not load or execute remotely hosted JavaScript, WebAssembly, or other executable code. Site icons may be loaded from remote image URLs for display only and are not executed as code.
```

## 5 数据使用 Data usage

### 5.1 数据类型选项

下表按当前代码处理的数据给出申报建议：**勾选浏览记录与网站内容**，后者范围仅为页面标题和站点图标，不表示读取网页正文。官方要求披露本地处理的数据，因此不能仅因没有后端而把所有数据类型都留空。后台若调整定义，按其当时对数据类型的解释核对本表。

| 数据类型 Data type | 建议选择 | 当前范围与说明 |
| --- | --- | --- |
| 个人身份信息 Personally identifiable information | 不勾选 / Unchecked | 不主动提取姓名、邮箱、地址等身份字段；标题或 URL 可能附带的信息仍随浏览数据在本地处理 |
| 健康信息 Health information | 不勾选 / Unchecked | 不提取健康记录 |
| 财务和付款信息 Financial and payment information | 不勾选 / Unchecked | 无付款功能，不提取交易或支付信息 |
| 身份验证信息 Authentication information | 不勾选 / Unchecked | 不读取密码、Cookie 或身份验证存储；URL 按标签页原值在本地处理 |
| 个人通信 Personal communications | 不勾选 / Unchecked | 不读取邮件、聊天或消息正文 |
| 位置信息 Location | 不勾选 / Unchecked | 不获取地理位置或进行 IP 定位；图标服务器仍可能接收图片请求的连接信息 |
| 浏览记录 Web history | **勾选 / Checked** | 为管理功能处理打开标签页和用户保存条目的 URL、标题、域名；不读取 Chrome 历史记录数据库 |
| 用户活动 User activity | 不勾选 / Unchecked | 不记录点击流、鼠标轨迹、按键日志或行为分析；搜索输入仅用于即时本地匹配 |
| 网站内容 Website content | **勾选 / Checked** | 仅处理页面标题与站点图标，用于列表识别；不注入脚本，不读取网页正文或表单 |

此处的两个勾选是基于当前实现和官方数据定义的申报判断，不表示 Google 已预先确认该提交。

### 5.2 数据处理说明

后台如有数据用途说明、审核备注或补充说明字段，可复制以下内容；数据类型复选框仍需按上表选择。

中文：

```text
Tab Station 为标签页管理功能在本机处理标签页标题、URL、域名、站点图标及窗口信息。用户设置、稍后阅读和已保存窗口保存在 chrome.storage.local 中。地址栏和管理页搜索关键词只用于本地匹配，不上传到开发者服务器。扩展没有分析、广告、数据出售或云同步服务，也不读取 Chrome 的历史记录数据库、网页正文、密码、Cookie 或表单内容。

当前版本可能向网站提供的图标 URL 发起图片请求；对应服务器可能收到请求所需的图标路径及 IP 地址等常规连接信息。扩展不会将标签页清单、已保存窗口或搜索关键词上传到开发者服务器。
```

English:

```text
Tab Station processes tab titles, URLs, domains, site icons, and window information locally to provide tab management. Settings, Read Later items, and Saved Windows are stored in chrome.storage.local. Search terms entered in the address bar or manager are used only for local matching and are not uploaded to developer servers. There are no analytics, advertising, data-sale, or cloud-sync services. The extension does not read Chrome's history database, page bodies, passwords, cookies, or form contents.

The current version may request images from site-supplied favicon URLs. The corresponding servers may receive the requested icon path and ordinary connection information such as the IP address. The extension does not upload tab lists, Saved Windows, or search terms to developer servers.
```

### 5.3 数据用途认证

下列三项按当前实现均建议**勾选 / Check**。它们是数据用途认证，不是“完全不处理用户数据”的声明。下表为语义对照，后台以实际显示的完整句子为准。

| 中文含义 | English meaning | 选择 |
| --- | --- | --- |
| 不在获准用途之外向第三方出售或转移用户数据 | Do not sell or transfer user data to third parties outside permitted uses | 勾选 / Check |
| 不将用户数据用于或转移至与扩展单一用途无关的目的 | Do not use or transfer user data for purposes unrelated to the extension's single purpose | 勾选 / Check |
| 不将用户数据用于或转移至确定信用状况或贷款资格 | Do not use or transfer user data to determine creditworthiness or lending eligibility | 勾选 / Check |

### 5.4 有限使用声明 Limited Use statement

以下为可复用的合规声明，不替代单独的隐私政策。可放在官网或隐私政策中的数据用途说明处。

中文：

```text
Tab Station 对从 Chrome API 获取的信息的使用遵守 Chrome 网上应用店用户数据政策，包括有限使用要求。此类信息仅用于向用户提供标签页和浏览任务管理功能，不用于广告、信用评估或与该功能无关的用途。
```

English:

```text
Tab Station's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements. This information is used only to provide tab and browsing-task management features, and is not used for advertising, credit evaluation, or unrelated purposes.
```

## 6 审核测试说明 Test instructions

| 字段 Field | 选择或填写 Selection or value |
| --- | --- |
| 是否需要登录 Sign-in required | 否 / No |
| 测试账号 Test account | 不适用；留空 / Not applicable; leave blank |
| 测试密码 Test password | 不适用；留空 / Not applicable; leave blank |
| 是否需要订阅或付费访问 Subscription or payment required | 否 / No |
| 特殊环境或配置 Special environment or configuration | 无 / None |

中文：

```text
无需账号、登录或订阅。请使用没有未保存内容的测试标签页，因为扩展操作会作用于真实标签页。

1. 打开两个普通 Chrome 窗口，在其中打开多个网页，并准备两个 URL 相同的标签页。
2. 点击扩展图标打开管理页。在全部模式查看按域名分组的标签页，在窗口模式查看各窗口的标签页。
3. 输入标题或 URL 关键词搜索。点击标签页切换到对应页面；测试拖拽排序和跨窗口移动。
4. 预览重复标签页，再执行去重。确认重复项关闭，并保留对应页面；固定标签优先保留。
5. 将一个普通标签页加入稍后阅读，确认源标签页关闭。打开该条目，确认页面打开且条目从清单移除。
6. 保存一个窗口，在已保存窗口模式恢复它，确认创建新窗口且已保存窗口仍然保留，可再次恢复。
7. 在地址栏输入 ts，按 Tab，输入关键词，确认可搜索打开的标签页、稍后阅读和已保存窗口。
8. 从管理页打开设置页，修改主题或语言，确认立即生效。关闭并重新打开管理页，确认保存的数据仍可使用。

扩展不替换新标签页，不需要外部服务账号。站点图标可能通过网站提供的图片 URL 加载。
```

English:

```text
No account, login, or subscription is required. Use test tabs without unsaved work, because extension actions affect actual browser tabs.

1. Open two normal Chrome windows with several web pages, including two tabs with identical URLs.
2. Click the extension icon to open the manager. Use All Tabs to view tabs grouped by domain, and By Window to view tabs within their windows.
3. Search by a title or URL keyword. Click a tab to switch to it. Test dragging to rearrange tabs and move them between windows.
4. Preview duplicate tabs, then remove duplicates. Confirm that duplicates close while the corresponding page is kept. Pinned tabs take priority.
5. Add a normal tab to Read Later and confirm that its original tab closes. Open the saved item and confirm that the page opens and the item is removed from Read Later.
6. Save a window and restore it from Saved Windows. Confirm that a new window opens and the saved snapshot remains available to restore again.
7. Type ts in the address bar, press Tab, and enter a keyword. Confirm that open tabs, Read Later items, and Saved Windows can be searched.
8. Open settings from the manager and change the theme or language. Confirm that changes apply immediately. Close and reopen the manager to confirm that saved data remains available.

The extension does not replace the new tab page or require an external service account. Site icons may load from site-supplied image URLs.
```

## 7 分发与发布选项 Distribution and publishing

以下是首次正式公开发布的建议，不表示已经提交审核或发布。

| 后台字段 Field | 建议选择 Selection | 说明 |
| --- | --- | --- |
| 可见性 Visibility | 公开 / Public | 可搜索和安装的正式版本 |
| 地区 Regions | 所有地区 / All regions | 当前功能无地区依赖；如有实际发行限制再缩小范围 |
| 定价或购买相关问题 Pricing or purchase questions | 免费；无应用内购买 / Free; no in-app purchases | 若后台询问，按当前版本填写；无需寻找未显示的定价字段 |
| 提交后的发布方式 Publishing after review | 延后发布或手动发布 / Deferred or manual publishing | 建议审核通过后检查资料再发布；后台具体措辞可能不同 |
| YouTube 宣传视频 Promotional video | 上传视频到 YouTube 后填写链接 | 本地英文视频已准备；尚未上传时留空 |

## 8 官方图片与宣传视频要求 Graphic assets and promotional video

核对日期：2026-11-14。以下区分官方规格、官方设计建议和本项目制作建议。来源为 [商店资料字段](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets)、[图片规格](https://developer.chrome.com/docs/webstore/images) 与 [优质商店页面指南](https://developer.chrome.com/docs/webstore/best-listing)。

后续重制素材可直接使用 [素材制作提示词](../chrome-web-store/PROMPTS.md)，包含整套任务和各类素材的独立提示词、英文字幕参考及验收标准。

### 8.1 规格与提交方式

| 素材 Asset | 必填 Required | 尺寸或提交方式 Specification | 数量 Quantity | 本地化 Localization |
| --- | --- | --- | --- | --- |
| 功能截图 Screenshots | **是，至少 1 张** | **1280 × 800 px**；图片规格页也接受 **640 × 400 px**，优先前者 | 每套 1～5 张，官方建议提供 5 张 | 支持按语言提交 |
| 小宣传图 Small promo tile | 否，可选 | **440 × 280 px，PNG 或 JPEG** | 一个对应图片位 | 不支持按语言分别上传 |
| 横幅宣传图 Marquee promo tile | 否，可选 | **1400 × 560 px，PNG 或 JPEG** | 一个对应图片位 | 不支持按语言分别上传 |
| 宣传视频 Promotional video | 否，可选 | **填写介绍扩展功能的 YouTube 视频链接**，不是上传视频文件 | 一个全局视频链接位，也可填写本地化视频链接 | 支持按语言提交 |

截图尺寸在官方页面中存在详略差异：商店资料页列出 1280 × 800，图片规格页和优质页面指南另列 640 × 400。本项目统一采用 **1280 × 800 PNG**，不使用替代尺寸。PNG 是本项目的截图交付格式；不要将宣传图的格式描述混同为截图仅允许某一种格式的官方结论。

除以上素材外，商店图标也是必填项，规格为 **128 × 128 PNG**。宣传图与视频不能替代必填截图。[官方素材字段与必填性](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#graphic-assets)

### 8.2 功能截图 Screenshots

**官方要求与展示规范：**

- 使用直角，画面铺满，不增加外围留白或衬边（full bleed）。这不限制产品界面内部本身的圆角和布局留白。
- 展示当前版本的实际功能与用户体验，聚焦核心内容。
- 画面方向正确，不能模糊、失真或出现非刻意设计的像素化；避免堆积大量文字。
- 品牌表现与商店图标、宣传图等素材保持一致。

来源：[截图规格](https://developer.chrome.com/docs/webstore/images#screenshots)、[截图质量指南](https://developer.chrome.com/docs/webstore/best-listing#screenshots)。

**本项目交付：** 简体中文和英文各 5 张、1280 × 800 PNG，使用演示数据与对应语言界面。上传顺序为总览、窗口管理、搜索与去重、稍后阅读、已保存窗口。文件和下载包见 [商店素材目录](../chrome-web-store/README.md)。

### 8.3 小宣传图与横幅宣传图 Promotional images

**官方用途：** 小宣传图用于首页、分类页和搜索结果；横幅宣传图供入选首页推荐轮播时使用。提供横幅不保证获得推荐。[官方宣传图用途](https://developer.chrome.com/docs/webstore/best-listing#promotional-images-promo-tiles-and-marquee-image)

**官方设计建议：** 突出品牌，不要只拿界面截图充当宣传图；少文字、少杂乱元素，缩小到一半仍可辨识。填满画面，边缘清晰，避免大面积白色或浅灰色。不得使用“编辑精选”“排名第一”等误导当前商店地位的宣传语。[官方设计指南](https://developer.chrome.com/docs/webstore/best-listing#promotional-images-promo-tiles-and-marquee-image)

**本项目制作建议：** 两张图沿用 Tab Station 品牌标识与橙色视觉元素，以标签页整理的图形表达为主。由于宣传图不支持本地化，优先使用品牌英文名和图形，避免大段中文。分别按 440 × 280 和 1400 × 560 独立构图，不将同一图片拉伸到两个尺寸。

已交付英文 [440 × 280 小宣传图](../chrome-web-store/promo/small-promo-en.png) 与 [1400 × 560 横幅宣传图](../chrome-web-store/promo/marquee-promo-en.png)，分别构图，沿用仓库既有 SVG 品牌标识。

### 8.4 宣传视频 Promotional video

**官方提交方式：** 在 `Promotional video` 或 `Localized promo video` 字段填写 YouTube 链接。可以为不同语言提供不同视频。商店展示顺序为本地化视频、本地化截图、全局视频、全局截图。[官方视频字段与展示顺序](https://developer.chrome.com/docs/webstore/cws-dashboard-listing#order-of-graphic-assets)

**官方内容建议：** 通过视频说明真实用户体验和主要功能，品牌表现与其他商店素材一致。[官方页面质量指南](https://developer.chrome.com/docs/webstore/best-listing#screenshots)

上述 Chrome 商店官方页面未规定统一的视频时长、帧率、分辨率或视频文件大小，不应把制作建议写成商店硬性门槛；视频文件本身的上传限制由 YouTube 决定。

**本项目制作建议，非官方强制要求：** 使用 16:9、1920 × 1080，约 30～60 秒的演示视频，依次展示管理页总览、搜索、去重预览、稍后阅读和恢复已保存窗口；使用测试数据，并配对应语言的字幕。提交前用未登录状态检查视频能否播放，以及能否嵌入商店页面。暂不制作时，保持视频字段留空即可。

已交付 [英文宣传视频 MP4](../chrome-web-store/video/tab-station-promo-en.mp4) 与 [英文字幕 SRT](../chrome-web-store/video/tab-station-promo-en.srt)：1920 × 1080、16:9、约 41 秒、30 fps，真实扩展功能操作与英文画内字幕，无配音和音乐。包含实际扩展入口打开及快捷键说明；由于系统未授予键盘自动化权限，快捷键段展示真实设置，不是按键触发实录。演示数据、录制边界及下载包见 [素材说明](../chrome-web-store/README.md)。视频尚未上传 YouTube，提交商店前仍需完成上传、播放与嵌入检查。

新增 [英文配音版 MP4](../chrome-web-store/video/tab-station-promo-en-voiced.mp4)，保留原版画面与画内字幕，加入与功能段对齐的英文旁白，无背景音乐。另附 [旁白稿](../chrome-web-store/video/voiceover-en.md)、[独立音轨](../chrome-web-store/video/tab-station-voiceover-en.wav) 与 [旁白字幕](../chrome-web-store/video/tab-station-promo-en-voiced.srt)。原无配音版继续保留。

## 9 提交前对照

- 核对上传包的版本、实际名称及简短介绍。本文建议名称与简介尚未写入 manifest 本地化消息。
- 若仍使用当前图标实现，保留文案中对站点图标请求的说明；若完成本地图标改造，重新核对权限说明、数据说明和商店介绍后再填写。
- 本文的数据声明需与另外准备的隐私政策一致，尤其是标签页元数据、本地存储、图标请求和有限使用用途。
- 不把“无开发者后端”改写为“不处理任何用户数据”。不宣称跨设备同步、完整历史记录查询、AI 摘要或其他当前没有的功能。

## 10 官方参考与代码依据

后台栏目和政策依据：

- [商店资料字段 Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [图片规格 Supplying images](https://developer.chrome.com/docs/webstore/images)
- [截图与宣传素材质量 Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing)
- [分类定义 Category definitions](https://developer.chrome.com/docs/webstore/best-practices#choose-your-extensions-category-well)
- [权限和隐私字段 Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [本地数据披露与有限使用 User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [分发设置 Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)
- [站点图标接口 Favicon endpoint](https://developer.chrome.com/docs/extensions/how-to/ui/favicons)

本文对具体选项的建议基于上述字段含义和当前代码；不是官方对本扩展的审核结论。

项目依据：

- [产品命名约定](naming.md)
- [当前功能说明](../README.md#功能特性)
- [Manifest 与权限](../public/manifest.json)
- [英文 manifest 文案](../public/_locales/en/messages.json)
- [中文 manifest 文案](../public/_locales/zh_CN/messages.json)
- [数据模型与本地存储](../src/lib/storage.ts)
- [图标加载逻辑](../src/components/Favicon.tsx)
- [地址栏搜索实现](../src/background.ts)
