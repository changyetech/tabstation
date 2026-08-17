# 性能 / 稳定性 / 体验优化 pass（2026-08-17）

**类型**：Design spec（descriptive）。目标是在**不改变任何用户可见功能**的前提下，修掉一轮实现层面的性能热点、竞态与体验缺口。

**非目标**：新功能、UI 改版、数据模型变更、权限变更。任何一条若无法在「行为不变」前提下完成，则退出本 pass 转独立 spec。

## 1. 背景

当前实现在小规模（十几个 tab）下体感正常，但存在三类可被压掉的成本：

- **刷新风暴**：`useTabs` 对 10 类 chrome 事件逐条全量重查。单个页面加载会连发多条 `onUpdated`（status / title / favIconUrl），N 个 tab 同时加载时每秒可产生数十次「3 次 chrome API + 全树重渲染」。
- **渲染期的多项式复杂度**：`getMoveTargets` 每行都重扫全部窗口 × 全部 tab（O(行 × 窗 × tab)）；`windowsWithTabs` 每窗口重扫全部 tab；`groupByDomain` / `findDuplicateGroups` 用 `[...prev, item]` 累积分组（O(n²) 拷贝）；`Intl.RelativeTimeFormat` 每行每次渲染重新构造。
- **动效资源**：每次批量关闭为每行创建 17 个粒子且**每个粒子一条 rAF 循环**（关 50 行 = 850 元素 / 850 条循环）；`playCloseSound` 每次新建并关闭一个 `AudioContext`（Chrome 对同页并发 AudioContext 有上限）。

以及两个真实竞态 / 陈旧数据缺陷（见 §3）。

## 2. 性能项（行为不变）

| # | 位置 | 现状 | 改为 |
| - | - | - | - |
| P1 | `hooks/useTabs.ts` | 每个事件一次全量重查 | 事件合流：首个事件立即重查（保持响应即时），其后 60ms 冷却窗口内的事件合并为一次尾随重查。`seq` 防陈旧覆盖保留 |
| P2 | `manager/App.tsx` | `now` 随 `tabs` 变化更新（每次刷新多一轮渲染） | 独立 30s 定时器驱动（展示粒度为分钟，30s 足够），刷新不再带动全树时间重渲染；且空闲时相对时间不再冻结 |
| P3 | `manager/App.tsx` | `getMoveTargets` 每行 O(窗 × tab) | 每次渲染按窗口算一次元信息（`useMemo`），每行仅按 `windowId` 过滤 |
| P4 | `manager/App.tsx` | `windowsWithTabs` / `closeWindow` 每窗口 `visible.filter` | 一次分桶 `Map<windowId, tabs>` 复用 |
| P5 | `lib/grouping.ts`、`lib/dedupe.ts` | `map.set(k, [...(map.get(k) ?? []), tab])` | 取数组后 `push`（O(n)） |
| P6 | `lib/time.ts`、`components/Hero.tsx` | 每行每次渲染 `new Intl.RelativeTimeFormat`；Hero 每次渲染 `new Intl.DateTimeFormat` | 按语言缓存/记忆化 formatter |
| P7 | `lib/effects/confetti.ts` | 每粒子一条 rAF 循环，无上限 | 单条共享 rAF 驱动全部粒子；活跃粒子上限 400（超出的爆发不再入场，避免大批量关闭时 DOM 爆炸）；一次爆发用 `DocumentFragment` 单次插入 |
| P8 | `lib/effects/batch.ts` | 逐行错开 40ms 无上限（关 50 行要等 2.3s 才真正 remove） | 错开总时长封顶 600ms（`stagger = min(40, 600/(n-1))`）；≤16 行时与现状完全一致 |

「行为不变」判据：P1/P2 只改**触发时机**不改数据口径；P3–P6 是等价重写，输出逐项相等（由既有单测锁定）；P7/P8 在常规规模（≤16 行）下视觉与时序不变。

## 3. 稳定性项

- **S1 稍后阅读删除竞态（真缺陷）**：`deleteReadLater` 的提交回调延迟到退场动画结束（300ms）后执行，且闭包捕获的是点击时的清单快照。300ms 内连删两条 → 第二条的提交基于旧快照，**已删的第一条会复活**。同类风险存在于所有「基于渲染期快照计算下一份清单」的写入（含多管理页并发写）。
  改为：`useStorageState` 的 writer 支持函数式更新 `write(prev => next)`，内部以最新已提交值为基准；App 的清单/会话类写入统一改用函数式形式。
- **S2 `AudioContext` 泄漏/上限**：改为模块级单实例复用（`suspended` 时 `resume`），不再每次 new + close。
- **S3 omnibox 陈旧建议**：`onInputChanged` 的异步结果无序号保护，先发起后 resolve 的旧输入会用过期结果覆盖 `suggest` / 默认建议。加单调序号，过期结果直接丢弃。
- **S4 `tabs.onReplaced` 未监听**：预渲染换页会替换 tabId，此时列表 tabId 陈旧（点击激活会失败）。补入监听列表。

## 4. 体验项

- **U1 favicon 失败标记随站点复位**：`Favicon` 的失败态是布尔值，tab 导航到新站点、`favIconUrl` 已更换后仍永久走 `_favicon` 回退。改为记录「失败的那个 URL」，URL 变化即重新尝试。
- **U2 尊重「减弱动态效果」**：`tokens.css` 已按 `prefers-reduced-motion` 去掉 CSS 动画，但 JS 驱动的纸屑不受其影响。该偏好开启时纸屑不再发射（音效与关闭行为不变）。

## 5. 验收

- `make check` 全绿；既有 246 个用例不修改语义（仅在 API 形状变化处补充调用方）。
- 新增用例覆盖：事件合流只重查一次、函数式写入基于最新值、AudioContext 单实例、错开总时长封顶、omnibox 陈旧结果被丢弃、favicon 换站点后重试、reduced-motion 下不发射纸屑。
