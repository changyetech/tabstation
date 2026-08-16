# 文案校准与润色（Copy Polish）

- 日期：2026-08-16
- 状态：已实现
- 范围：`src/i18n/{zh_CN,en}.json`、`public/_locales/`、`src/i18n/index.tsx`（复数插值）、相关 key 调用点与测试

## 1. 目标

全量核对 UI 文案与代码真实行为，修正三类问题：

1. **不准确**——文案描述与实际行为不符；
2. **不地道**——英文语法/习惯用法错误（复数、搭配）；
3. **标识不准确**——i18n key 名与其实际用途不符。

## 2. 准确性修正（文案 ↔ 行为对齐）

| Key | 问题 | 修正 |
|---|---|---|
| `settings.scopeDesc` | 只提快捷键；实际图标点击同样走单例逻辑（`background.ts` 两个监听器共用 `safeOpenManager`） | 补「点击图标」 |
| `settings.newWindowModeDesc` | 只列举「拆窗/新窗口打开」；实际是一切「在新窗口打开」类动作的统一出口（`createWindowBySetting`，含恢复会话、稍后阅读全开、新建空窗口） | 按 CONTEXT.md「新窗口尺寸策略」措辞改为全集描述 |
| `settings.visibleTabs(*Desc)` | 写「每个窗口」；实际折叠同样作用于域名区块与会话卡片 | 改为「每个区块」 |
| `settings.appearanceDesc` | 写「主页」；领域词汇表规定术语为「管理页」 | 改为「管理页」 |
| `settings.managerPageScope` | 「管理页单例」为开发术语（singleton），不面向用户 | zh「管理页保持唯一」/ en "Single manager page" |
| `dom.readLater` | 只写「固定标签除外」；实际还跳过非 http(s) 标签（`domainReadLater` 过滤 `/^https?:/`） | 补「非网页标签除外」 |
| `toast.domOnlyPinned` | 「只有固定标签」在稍后阅读路径不成立（全为 chrome:// 等非网页时同样触发） | 措辞改为「固定或非网页」，key 改名（见 §4） |
| `sessions.emptySnapshot` | 中文文案夹英文 "tab"；页面层中文一律「标签页」 | 「没有可保存的标签页」 |

## 3. 英文润色（idiomatic）

- `hero.greetNoon`: "Good noon"（非母语用法）→ "Good afternoon"。
- `tab.activate`: "Click to jump" → "Switch to tab"（Chrome 自身用语）。
- `toast.dom*`: "tabs of {host}" → "tabs from {host}"。
- `readLater.delete`: "Delete from list" → "Remove from list"。
- `settings.saved` / `settings.themeSaved` / `settings.pageSub` / `toast.readLaterSaved` / `toast.rlOpenAll`：语气与标点润色。
- **复数插值**：en 计数类文案（"1 tabs" / "1 items" / "Closed 1 duplicate tabs"）为语法错误。`useT` 新增最小复数选择语法 `{k|单数|复数}`（按参数值是否为 1 取词），仅 en 文案使用；zh 不受影响。

## 4. Key 改名（标识准确性）

| 旧 | 新 | 原因 |
|---|---|---|
| `toast.split` | `toast.openedNewWindow` | 同一文案被「拆到新窗口」与「会话条目新窗口打开」两处复用，内容是通用的「已在新窗口打开」，key 名以 split 命名不准确 |
| `toast.domOnlyPinned` | `toast.domNoEligible` | 触发条件不限于 pinned（见 §2） |

## 5. manifest 层（`public/_locales/`）

- zh `extDescription`：「集中式 TAB 管理」→「标签工作站——集中管理所有标签页……」（对外文案使用中文名，遵循 `docs/naming.md` §2；「TAB」非中文习惯写法）。
- zh `cmdOpenManager`：「打开 TAB 管理页」→「打开管理页」（对齐领域词汇表）。
- en `cmdOpenManager`：「Open tab manager」→「Open manager page」（对齐设置页 `settings.shortcutOpenManager`）。

## 6. 不改动项（有意保留）

- `Settings.newWindowMode` 的持久化枚举值 `'max'`（实际行为是 `state: 'fullscreen'`）：改名需迁移已落盘数据，收益不抵风险；用户可见文案「全屏 / Full screen」与行为一致，仅内部值名义上偏差。
- `dom.closeAll` 中文「固定标签除外」：关闭路径确实只跳过 pinned，保持原样。
