# 已保存会话卡片：条目行对齐 by windows + 跨会话拖拽

- 日期：2026-08-16
- 状态：待评审
- 关联：修订 [2026-08-16-manager-redesign.md](2026-08-16-manager-redesign.md) §5.5「已保存会话」条目行规则；其余 §5.5 内容（卡片头、恢复/重命名/删除、折叠、空态）不变。

## 1. 目标

已保存会话卡片的条目行在样式与拖拽行为上**完全对齐** by windows 视图的标签行，并支持**跨会话拖拽**移动条目。

## 2. 条目行样式与交互（对齐 TabRow）

`SessionTabRow` 的 markup 改为与 `TabRow` 相同的 class 结构（`li.tab-row` > `div.tab-line`），复用现有 CSS，不新增样式：

- 行结构：行首 **grip 把手** → favicon → pinned 图钉图标（有 `pinned` 标记时）→ `tab-title` → `tab-host`（域名列，`hostnameOf(url)`）→ `row-spacer` → 行尾操作区 `row-acts`。
- **两行式布局废弃**：不再显示完整 URL 子标题，改为与 by windows 一致的单行「标题 + 域名列」。
- **整行可点 = 在当前窗口打开该条目**（`role="button" tabindex="0"`，Enter/空格 键盘等效；模板式语义：条目保留）。原「标题单独可点」废弃，落点扩大为整行。
- 行尾操作保留 session 特有两项：**新窗口打开**（条目保留，尺寸遵循设置）、**移除此条**（danger；删空则会话消亡）。按钮点击 `stopPropagation`，不触发整行打开。
- **不渲染时间列**：会话快照无 `lastAccessed`，该列整体省略（非显示 `—`）。去重徽标、移动菜单、稍后阅读、拆窗按钮为实时标签页专属，不出现在会话行。
- **pinned 完全对齐 by windows**：不可拖（sortable disabled）、grip 呈 ghost 态、显示图钉图标。
- 拖拽手感：整行为拖拽区、PointerSensor 5px 位移阈值、拖动位移动画（现状保留）。

## 3. 跨会话拖拽

### 3.1 语义

- 从会话 A 拖到会话 B：**移动**——条目从 A 移除，插入 B 的落点位置。
- **源会话被拖空 → 自动删除**（与既有「删条目删到空即删会话」规则一致，不留空会话）。
- 同会话内拖拽：重排，行为不变；`from === to` 不写 storage。
- 落点不做 pinned 钳制：卡片内顺序仅为展示；恢复时 Chrome 自动将 pinned 标签移至最前。

### 3.2 接线

- `DndContext` 从每张 `SessionBlock` **提升到 `SessionSection` 顶层**（一个 context 包住全部会话卡片；每卡保留自己的 `SortableContext`）——与 by windows 在 App 层包住全部 `WindowSection` 同构，为跨卡拖拽的成立条件。
- sortable id 保持 `${sessionId}:${index}`；`data` 由 `{ index }` 扩为 `{ sessionId, index }`。
- `onDragEnd`：读取 active/over 的 `{ sessionId, index }`，有有效落点且非原位 → 调 `onMoveTab(fromSessionId, fromIndex, toSessionId, toIndex)`。
- 组件接口：`SessionSectionProps.onReorderTab(s, from, to)` → `onMoveTab(fromSessionId, fromIndex, toSessionId, toIndex)`。

### 3.3 数据操作（storage.ts 纯函数）

`reorderSessionTab` 升级为跨会话版本：

```
moveSessionTab(sessions, fromSessionId, fromIndex, toSessionId, toIndex): SavedSession[]
```

- 同会话：等价既有 reorder。
- 跨会话：源会话移除 `fromIndex` 条目，目标会话 `toIndex` 处插入；源会话拖空则删除。
- 任一 id 不存在或下标越界：原样返回（防陈旧拖拽状态）。

## 4. 边界情况

- **折叠卡片**：`foldTabs` 展示前缀，可见行下标 = 原数组下标，落点下标直接可用；被折叠隐藏的行不是落点（与 by windows 现状一致）。
- **拖到卡片空白处**：dnd-kit 以最近行为 over；卡片不会为空（空会话已自动删除），无空容器落点问题。

## 5. 测试要点（TDD）

1. `storage.test.ts` — `moveSessionTab`：同会话重排、跨会话移动（源删目标插）、源拖空自动删会话、越界/未知 id 原样返回。
2. `SessionSection.test.tsx` — 行 markup 对齐（`tab-row`/`drag-grip`/`tab-host`，无时间列、无 URL 子标题）；pinned 行不可拖 + ghost grip + 图钉；整行点击调 `onOpenTab`，行内按钮不触发；`onDragEnd` 跨卡时以正确四参调 `onMoveTab`。
3. `dnd.test.ts` — `sessionDragEndToMove` 落点映射（跨卡 / 同卡 / 无落点或原位 → null）。App 侧接线为单行透传，jsdom 无法派发 dnd 拖拽事件，由类型检查与上述纯函数测试共同覆盖，不在 `App.test.tsx` 单测。

## 6. 非目标

- 会话卡片与实时窗口（by windows / 全部模式）之间的互拖。
- 会话卡片整卡排序。
- 拖拽复制、多选拖拽。
