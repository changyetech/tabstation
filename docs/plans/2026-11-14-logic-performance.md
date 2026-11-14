# 逻辑性能优化实施计划

**Goal:** 保持现有产品目标，消除可复现的计算热点与异步顺序缺陷。

**Architecture:** 沿用 lib / hooks / components 分层，局部替换算法与安排已有 Promise 的先后顺序。

**Tech Stack:** React 18、TypeScript、Chrome MV3、Vitest、pnpm。

**Spec:** [页面流程与逻辑性能优化](../specs/2026-11-14-logic-performance.md)。

## 约束与复核重点

不改 UI 布局、权限、数据格式；保留私有后缀与自然数域名排序、重复组固定标签优先规则、全局去重口径；保存失败不得关闭源对象，打开失败不得删除清单；同一 key 的读改写经 Web Locks 串行。

## 步骤

- [x] 记录基线测试、构建与同数据算法耗时。
- [x] `src/lib/grouping.ts`：预计算排序键；扩充特殊域名、顺序与不可变性用例，再跑 grouping 测试。
- [x] `src/lib/storage.ts`：新增 `upsertReadLaterBatch(list, tabs, now, newId)`，保留单条接口；测试与逐条操作结果一致、批次内重复、空批次、不修改输入。
- [x] `src/hooks/useTabs.ts`：测试相同快照复用及变更传播后，实现准确的浅字段快照比较（mutedInfo 单独比较）。
- [x] `src/hooks/useStorageState.ts`：用可控 Promise 复现初始读覆盖 onChanged，随后修正失效标记。
- [x] `src/manager/App.tsx` / `src/components/DomainGroupList.tsx`：应用批量接口、拆分分组/预览缓存、缓存域名总数、清理 toast；测试持久化/创建延迟和失败，再调整保存关闭、打开移除的时序。
- [x] 整合后台及组件只读检查结果，复核所有改动；运行 `make check`、`pnpm build` 与相同基准，记录证据和未验证范围。
- [x] `src/settings/App.tsx` 与 `useStorageState`：补写入拒绝及延迟测试，成功反馈等待完成，失败保留已保存值。
- [x] `src/components/SessionSection.tsx`：输入法组合 Enter/Escape 测试后补事件守卫。
- [x] `src/components/MoveMenu.tsx` / `src/manager/styles.css`：补超高菜单位置测试，限制高度与滚动，保持短菜单行为。
- [x] `src/lib/storage.ts` 新增 `updateKey<T>(key, fallback, next)`：持锁读取最新值再计算写回；`useStorageState` 不提前提交未保存值，用订阅版本拒绝过期结果。测试并发页面、失败释放锁和读取前修改。
- [x] 后台稍后阅读删除改用 `updateKey`，测试打开期间新增/删除与并发打开；管理页入口同源锁、pendingUrl、后台打开 disposition 与空查询分支补回归测试。
- [x] 提取 `hostnameOf` 到 `src/lib/url.ts`、`visibleTabs` 到 `src/lib/tabs.ts`，后台从轻量模块导入；保留 grouping 原导出兼容调用方。比较构建后的后台传递依赖体积，确认不再加载域名后缀库。
- [x] 复核发现的异步边界：会话删除/移动校验源和目标条目快照；稍后阅读打开中按 id 防重入；菜单视口增高时先应用新限高再测量。补回归测试后修复。
