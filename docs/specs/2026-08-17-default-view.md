# Mode Order & Default View

## Goal

Put the全部模式 (All tabs) segment first in the control bar, and let the user choose which of the two tab views the manager page opens in.

## Scope

### Mode order

- Control bar segment order becomes: 全部模式 (all) → 窗口模式 (by window) → 已保存会话 (sessions).
- Only the visual/DOM order changes; each segment keeps its icon, label, and `onMode` payload.

### Default view setting

- `Settings` gains `defaultView: 'all' | 'window'`, default `'all'`; missing values fall back through `mergeSettings`.
- Settings page 行为 group gains a 默认视图 select with two options, labelled with the same strings as the control bar segments (全部模式 / 窗口模式). Saved instantly like every other setting.
- 已保存会话 is not offered — it is a saved-data view, not a tab view.
- The manager page (and the new tab page, which reuses it) opens in `defaultView`. Once the user switches modes on the page, that choice wins for the rest of the page's lifetime — a later `defaultView` change never overrides it.
- Settings are read asynchronously, so the initial paint uses `'all'` until storage resolves; no other page behavior changes.

## Verification

- Toolbar test asserts the DOM order of the three segments.
- Settings page test asserts the select saves `defaultView`.
- Manager page tests assert the opened view follows `defaultView`, and that a manual mode switch is not overridden.
- `make check` passes.
