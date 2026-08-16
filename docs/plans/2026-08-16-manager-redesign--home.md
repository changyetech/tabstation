# 管理页重设计 · 子计划：home

- Implements: [spec §3.1, §5](../specs/2026-08-16-manager-redesign.md)
- Depends on: foundation
- 目标：管理页视觉与交互完全对齐 `refs/design/tab-station-home.html`，新增 Hero、折叠、拆窗、域名批量、去重 UI 规则、侧栏重构。

## 步骤

1. **样式重建**：`src/manager/styles.css` 以设计稿 CSS 为蓝本全量重写（引用 tokens.css 变量，不留硬编码色值）；类名尽量沿用设计稿（`win-block`/`tab-row`/`panel`…），组件 className 随之更新。
   → verify: 构建通过，快照类测试更新。
2. **Toolbar → Hero + 控制条**
   - 新 `Hero` 组件：问候语（按小时五档，每分钟刷新）+ `Intl` 中文长日期 + 五项统计（窗口/标签页/域名/组重复/待读；数据从 App 既有 memo 派生）。
   - Toolbar 改为吸顶控制条：模式居左；右侧一键去重（仅 `dupGroups.length>0` 渲染，文案带 `−N`）+ 视图切换。**删除历史与设置按钮**及其 i18n key。
   → verify: 组件测试（统计数、按钮显隐、问候档位用注入时钟）。
3. **标签行重绘**（`TabRow`）：grip hover 显形（pinned 隐藏）、favicon/LetterBadge、pin 图标、标题、域名列、`×N` 徽章、相对时间；hover 时操作组原位替换时间。操作组：稍后阅读、**拆到新窗口**（新增，走 `createWindowBySetting` + `chrome.windows.create({tabId})` 语义；pinned 无前两钮）、移动（仅多窗口时）、关闭。
   - `MoveMenu` 改为设计稿 popover：仅列其他窗口（`窗口 N · 标题截断 + 数量`），**移除 new-maximized/new-same-size 两项**（其职责由拆窗按钮 + 设置承担）。
   → verify: TabRow/MoveMenu 测试更新（拆窗调用断言、菜单项数量）。
4. **窗口区块**（`WindowSection`）：区块头照稿（当前胶囊、favicon 叠层 ≤4、`N 个标签页 · N 固定`、保存会话/关闭窗口 ghost 按钮）；当前窗口强调描边。
5. **折叠**（新 `lib/fold.ts` 纯函数 + 区块内「还有 N 个 · 展开/收起」行）：作用域=窗口模式·列表视图（按窗口）与全部模式·域名视图（按域名）；展开集合为 App 内存状态；去重预览态旁路折叠。
   → verify: fold 纯函数单测 + 组件测试。
6. **域名视图升级**（`DomainGroupList` 与窗口内域名小节）：两行式标签行（标题+URL）、域名色顶条（全部模式区块）、≥1160px 双列 columns；域名头批量操作组：全部收进稍后阅读 / 拆到新窗口 / 关闭全部（跳过 pinned；全 pinned → toast）。作用域随模式（窗口内 / 全浏览器）。
   → verify: 批量操作纯函数（目标集计算）单测 + 组件测试。
7. **去重 UI 规则**：预览态只渲染重复组成员、无成员区块隐藏、禁用折叠/拖拽/新建窗口；hover 重复行高亮同组（keep/close 样式复用）。
   → verify: App 级测试（预览过滤、hover 组高亮）。
8. **主区补件**：新建窗口幽灵按钮（空态与列表底部）、全清空空状态文案照稿。
9. **侧栏重构**：`SessionSection` 移入右侧栏；`ReadLaterSidebar` 与会话面板均常驻 + 空态文案照稿。稍后阅读头部「全部打开」（一个新窗口开全部并清空，走 `createWindowBySetting`）；行操作：新窗口打开（移除）、删除。会话行照稿（chevron 旋转、hover 操作组）；条目新增「新窗口打开」（条目保留）。恢复会话与所有新窗口动作遵循 `newWindowMode`。
   → verify: 面板组件测试更新（空态渲染、全部打开清空断言）。
10. **动效**：viewIn 180ms（模式/视图切换重放）、区块 fadeUp 错开、操作组 actsIn、会话 panelIn、按压 1px；沿用既有关闭动效；全部尊重 reduced-motion。
11. **清理**：删除 emoji 图标残留、无用 i18n key、旧 CSS 规则；`rtk grep` 校验无 `#` 硬编码色值残留于组件层。

## 验收

- `make check` 全绿；1440×900 双主题与设计稿逐区块目视一致；~700px 无横向滚动。
- 新功能（折叠/拆窗/域名批量/全部打开/去重显隐与组高亮）各有测试。
