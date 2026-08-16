# 管理页重设计 · 子计划：settings-page

- Implements: [spec §3.2, §4](../specs/2026-08-16-manager-redesign.md)
- Depends on: foundation
- 目标：按 `refs/design/tab-station-settings.html` 落地独立设置页，注册为扩展 options 页；删除 `SettingsDialog`。

## 步骤

1. **新 surface**：`src/settings/index.html` + `main.tsx` + `App.tsx`；vite `rollupOptions.input` 增 `settings` 入口；manifest 增 `options_ui: { page: 'src/settings/index.html', open_in_tab: true }`（构建产物路径以 vite 输出为准核对）。设置页复用 `I18nProvider`、`useStorageState`、`useTheme`、tokens.css。
   → verify: 构建产物含 settings 入口；chrome 加载后「选项」可打开。
2. **页面结构照稿**：顶栏（品牌标记 + Tab Station + 版本号，版本读 `chrome.runtime.getManifest().version`）；左 sticky 锚点导航（外观/行为/语言/快捷键/关于，点击高亮 + 锚点滚动；≤760px 隐藏）；分组卡片布局。
3. **设置项接线**（全部即时保存 → toast「已保存，即时生效」）：
   - 外观：三张主题预览卡（浅/深/自动，迷你窗口预览为固定色，选中打勾）→ `settings.theme`，本页与管理页即时换肤。
   - 行为：管理页单例（radio，含说明文案）→ `managerPageScope`；保存会话后关闭窗口（switch）→ `closeWindowAfterSave`；新窗口默认行为（select 全屏/随当前窗口）→ `newWindowMode`；每窗口默认展示条数（select 5/8/12/全部）→ `visibleTabs`。
   - 语言：select 自动/简体中文/English → `language`，本页文案即时切换。
   - 快捷键：`chrome.commands.getAll()` 读实际绑定渲染 kbd（无绑定显示未设置）；「在 Chrome 中修改」→ `chrome.tabs.create({url:'chrome://extensions/shortcuts'})`。
   - 关于：品牌标记 + 「Tab Station · 标签工作站」 + 版本行。
   → verify: 每项一个组件测试（改动 → storage 写入断言 + toast）。
4. **i18n**：新增全部 key 的 en / zh-CN 文案（zh 照稿原文；en 对应翻译）。
5. **删除 SettingsDialog**：组件、测试、App.tsx 中的 state/入口、相关 i18n key 全部移除（home 子计划已删 Toolbar 按钮；两计划都完成后 `rtk grep SettingsDialog` 应零命中）。

## 验收

- `make check` 全绿；设置页 1440×900 双主题与设计稿目视一致；≤760px 单列无横向滚动。
- 改动在管理页即时生效（另开管理页验证 storage 同步）；`SettingsDialog` 无残留。
