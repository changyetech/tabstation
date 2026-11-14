# Chrome 网上应用店素材

版本：0.3.0。制作日期：2026-11-14。图片均为 PNG；功能截图中英文各 5 张，均为 1280 × 800，按编号上传对应语言的商店页面。

| 顺序 | 简体中文 | English | 展示内容 |
| --- | --- | --- | --- |
| 1 | [01-all-tabs.png](zh_CN/01-all-tabs.png) | [01-all-tabs.png](en/01-all-tabs.png) | 浅色主题，跨窗口按域名聚合、统计与总览 |
| 2 | [02-window-management.png](zh_CN/02-window-management.png) | [02-window-management.png](en/02-window-management.png) | 深色主题，双窗口管理、固定标签与窗口操作 |
| 3 | [03-search-dedupe.png](zh_CN/03-search-dedupe.png) | [03-search-dedupe.png](en/03-search-dedupe.png) | 搜索 Chrome 相关标签页，悬停去重按钮展示保留与关闭预览 |
| 4 | [04-read-later.png](zh_CN/04-read-later.png) | [04-read-later.png](en/04-read-later.png) | 稍后阅读清单与新窗口打开操作提示 |
| 5 | [05-saved-windows.png](zh_CN/05-saved-windows.png) | [05-saved-windows.png](en/05-saved-windows.png) | 深色主题，可反复恢复的已保存窗口 |

英文宣传图片位不区分语言，沿用现有橙色「标签成 T」标识，两个尺寸分别排版：

- [小宣传图，440 × 280](promo/small-promo-en.png)
- [横幅宣传图，1400 × 560](promo/marquee-promo-en.png)
- 对应 HTML 排版源文件保存在同一目录，使用仓库现有 SVG 标识，不依赖生成式图片服务。

英文配音版：[tab-station-promo-en-voiced.mp4](video/tab-station-promo-en-voiced.mp4)，16:9、1920 × 1080、30 fps、41 秒，H.264 / AAC，包含分段对齐的英文旁白、原有画内字幕，无背景音乐。另附 [独立旁白音轨 WAV](video/tab-station-voiceover-en.wav)、[旁白字幕 SRT](video/tab-station-promo-en-voiced.srt) 和 [旁白稿](video/voiceover-en.md)。旁白字幕记录实际语音，画内字幕保留原有功能说明。

原无配音版：[tab-station-promo-en.mp4](video/tab-station-promo-en.mp4)，保留相同画面与 [英文字幕 SRT](video/tab-station-promo-en.srt)。

视频依次展示扩展入口打开管理页、快捷键说明、全部模式、窗口模式、搜索、去重预览与执行、稍后阅读保存与打开、保存窗口和恢复已保存窗口。功能操作录自独立 Chrome 中加载的实际扩展，使用演示数据。快捷键来自实际 `chrome.commands.getAll()` 和设置页；系统没有键盘自动化权限，因此这一段是快捷键使用说明，没有录到操作系统按键触发。扩展图标入口通过 Chrome 的 `Extensions.triggerAction` 执行实际 action，确认创建了管理页。

当前目录保存原始素材文件，可直接按用途使用。

上传商店时直接使用对应的 PNG。视频需要自行上传 YouTube，再把可播放且允许嵌入的链接填写到商店视频字段；MP4 不能直接上传该字段。本次没有向 YouTube 或商店发布内容。

截图和录屏使用当前构建的真实管理页与实际 Chrome API，演示标签页由隔离测试浏览器提供，截图初始页面内容由本地测试响应替代；录制期间打开的演示链接可加载对应公开页面，不包含用户真实浏览数据。稍后阅读和已保存窗口预置于测试配置文件；不改变产品控件或添加不存在的功能。图标使用本地演示图标或浏览器默认图标。

录制中确认稍后阅读保存使条目数从 4 增至 5，恢复已保存窗口使窗口数从 2 增至 3。以上仅说明所录路径，不替代完整回归测试。产品界面或文案变化后应重新制作。

上架字段、官方规格与制作建议见 [商店上架资料第 8 节](../docs/chrome-web-store-listing.md#8-官方图片与宣传视频要求-graphic-assets-and-promotional-video)。

后续重制可直接使用 [素材制作提示词](PROMPTS.md)，包括整套任务、截图、两种宣传图、功能录屏、英文字幕参考及验收提示词。
