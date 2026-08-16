# 管理页重设计 · 父计划

- Implements: [docs/specs/2026-08-16-manager-redesign.md](../specs/2026-08-16-manager-redesign.md)
- 日期：2026-08-16

## 概览

把 refs/design 两张屏幕稿完整落地：token 化视觉系统（含暗色）、Hero 与新功能、独立设置页。功能骨架（模式×视图、去重判据、稍后阅读/会话语义、拖拽、单例）不动，工作集中在样式层重建、App 编排扩展与新 surface。

## 子计划与执行顺序

1. [--foundation](2026-08-16-manager-redesign--foundation.md) — Settings 模型扩展、主题机制、token CSS、图标库、新窗口辅助函数、扩展图标
2. [--home](2026-08-16-manager-redesign--home.md) — 管理页全量重绘与新功能（Depends on: foundation）
3. [--settings-page](2026-08-16-manager-redesign--settings-page.md) — 独立设置页 + 删除 SettingsDialog（Depends on: foundation）

home 与 settings-page 互不依赖，可并行；但 home 会删除 Toolbar 的设置按钮，两者都完成前扩展仍可经 `chrome://extensions` 打开设置，无空窗期问题。

## 全局验收

- `make check` 全绿
- spec §7 六条验收标准逐条核对
- 加载扩展目视比对 1440×900 浅色/深色两主题
