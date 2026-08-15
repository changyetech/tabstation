# 产品命名约定（Naming Convention）

- 日期：2026-08-15
- 状态：已定名
- 性质：**契约（normative）**——本文件规定的名称写法是唯一权威来源。代码、manifest、文案与本文件不一致时，**以本文件为准，代码是缺陷**。

## 1. 最终名称

**英文名：`Tab Station`**
**中文名：标签工作站**

## 2. 各处写法规范

不同位置的写法**不可自由发挥**，一律按下表：

| 位置 | 写法 | 说明 |
|---|---|---|
| 品牌名（正式场合） | `Tab Station` | 两个词，各首字母大写 |
| Web Store 英文 name | `Tab Station — Manage & Rearrange All Your Tabs` | 副标题吃搜索权重，破折号用 `—` |
| Web Store 中文 name | `Tab Station — 标签工作站` | 品牌名不翻译，中文名作副标题 |
| `_locales/en/messages.json` | `Tab Station` | manifest 扩展名 |
| `_locales/zh_CN/messages.json` | `Tab Station` | **品牌名保持英文不译**，中文名仅用于 description 与对外文案 |
| `manifest.action.default_title` | `Tab Station` | |
| repo / 包名 / 目录名 | `tabstation` | 全小写，无连字符 |
| 域名 | `tabstation.*` | 具体后缀见 §6 待确认 |
| 代码内标识符 | `tabstation` | 全小写 |

**禁止写法**：`TabStation`（驼峰）、`Tab-Station`、`tab station`（正式场合小写）、`标签站`、`标签调度站`。

## 3. 名称内涵

`station` 取 **workstation（工作站）** 之义——**一个你在上面动手干活的操作台**，而非存放东西的容器。这一层区分是本产品与同类工具的定位分界线：

| 产品能力 | 与 station 的对应 |
|---|---|
| 集中管理页（全窗口全 tab 一览） | 所有 tab 汇集到同一个站点 |
| 拖拽同步真实 `tabs.move` | 在台面上伸手就挪，改的是真实对象 |
| 跨窗口移动 /「移动到 ▾」 | 站内调度、换轨、重新编组 |
| 窗口会话（模板式可反复恢复） | 站内留存的编组表 |
| 稍后阅读 | 站台侧线的待发清单 |
| 一键去重 | 站内清理重复车厢 |

**核心语义主张**：`Tab Station` 建立的第一预期是「**可操控的界面**」，而非「**存 tab 的箱子**」。OneTab / Session Buddy / Tab Deck 一类是快照收纳器，本产品是**写穿式操控台**（拖了就真的动了）。名称必须服务于这个区分——任何弱化「可操作」而强化「可存放」的改名提案，都应被驳回。

## 4. 判据（定名标准，后续改名提案一律按此评估）

| | 判据 | 说明 |
|---|---|---|
| C1 | 第一联想正确 | 听到名字预期是「操控全部 tab 的界面」，不能被误读成别的品类 |
| C2 | **中英双语都成立** | 中文用户能念、能记、能建联想；**不依赖英语文化梗** |
| C3 | 不撞名 | Web Store / GitHub / 域名 / 同音 |
| C4 | 形态 | ≤3 音节、拼写零歧义、无双字母陷阱 |
| C5 | 性格匹配 | 配得上 swoosh + 纸屑动效的产品调性，不沉闷 |

**C2 是最高优先级判据。** 本项目 i18n（en / zh-CN）是一等需求，名称必须在两种语言里建立**同一个正确预期**。凡是需要英语文化背景才能激活的隐喻（railway yard、workbench、corral、marshal 等），一律出局——这是历次候选翻车的共同原因。

## 5. 推荐理由

按 C1–C5 穷举 `Tab + 中文用户高频英语词` 的全部组合后，**唯一全过的候选**：

1. **C2 满分（决定性优势）**——`station` 是中文用户英语词表里的满分词（车站 / 工作站 / 空间站）。「标签工作站」在中文里是完全自然、无需解释的产品名。它是唯一一个在中英两种语言里建立同一个正确预期的候选。
2. **C1 干净**——`workstation` 的联想恰好指向「你在上面干活的操作台」，与 §3 的语义主张一致；且无竞争性第二义，不会被误读成跑分工具、AI 工具或收纳工具。
3. **C3 干净**——查重结果见 §7。
4. **保住商店搜索权重**——`Tab` 前缀 + 副标题双重覆盖。

**已知代价（接受）**：3 音节 9 字母偏长；调性中性偏专业，与产品俏皮动效略有温差。判断：名称负责让人在商店里正确理解产品，动效负责留存，两者不必同调性。2 音节的短位置在 `Tab*` 红海中已被占尽（见 §7），此代价无法规避。

## 6. 待确认事项

- [x] 域名可用性（2026-08-15 whois 查证）：`tabstation.com` **已被注册**；`tabstation.io` **可注册**（建议尽快落袋）；`tabstation.app` whois 受限未确认
- [ ] USPTO / 中国商标局 "TAB STATION" 商标检索（搜索引擎结果**不能**替代商标检索）

## 7. 落选候选与查重记录（2026-08-15）

记录在案以防后续重复提议。共两轮：第一轮为定名评估；第二轮（2026-08-15，定名后复核）按 §4 判据评估 8 个新候选并全部驳回，**维持 `Tab Station` 定名**——挑战者的优势集中在低权重项（域名/音节/调性），而 C1/C2 两项最高权重判据均由 `Tab Station` 胜出。

| 候选 | 结论 | 原因 |
|---|---|---|
| **Tab Station** | ✅ **采用** | 全网无同名，C1–C5 全过 |
| Tabyard | ❌ | C2 失败：中文零感知；C1 风险：第一联想是 junkyard / backyard（囤积），与 §3 主张相反 |
| Tab Bench | ❌ | C1 失败：搜索引擎自动关联 `benchmark`（跑分工具误读）；C2 失败：中文认知的是 workbench 而非 bench |
| Tabdesk | ❌ | C3 失败：与 Tab Deck（1 万用户在架扩展）**中文口语同音** |
| Tabdeck | ❌ | C3：[Tab Deck](https://chromewebstore.google.com/detail/tab-deck-tabtab-group-man/lajbajamkpmkmldodfbljkjihppdclbm) + [TabDeck](https://chromewebstore.google.com/detail/tabdeck-manage-your-works/bkbhaomcanclcpmnlnbdmaechdbgkcfe) + [tabdeck.so](https://tabdeck.so/) |
| Tabsmith | ❌ | C3：[TabSmith](https://chromewebstore.google.com/detail/tabsmith/cnmhcimjhhghdmmackeilodgkbobalod) 在架 + tabsmith.in |
| Tabmap | ❌ | C3：至少 4 个同名扩展 |
| Tabpilot | ❌ | C3：3 个同名（含 AI 工具），且 `*pilot` 已被 AI 品类污染 |
| Tabrack | ❌ | C3：[tabrack.com](https://tabrack.com/) 在架，且为正面竞品（见 §8） |
| TabCorral | ❌ | C3：曾在架（2025-09 下架），且 "Tab Corral" 是 Tab Wrangler 的核心功能名 |
| Tabmux | ❌ | C2：对非开发者是黑话；概念撞 tmux 工具 |
| Tabwall | ❌ | C1：`firewall` / `paywall` 误读；且 wall 偏静态展示，弱操控 |
| Tabtower | ❌ | C4：`tab-tower` 双 t 拗口；C1：tower 是「摞成一堆」的囤积联想 |
| Tabmarshal | ❌ | C2：中文无感；C4：9 字母偏长；开发者语境有 marshalling（序列化）歧义 |
| Tabboard / Tabdock / Tabroom / Tabzone | ❌ | 分别为：双 b + 撞名 / macOS 程序坞联想 / 撞 tabroom.com / 语义空洞 |
| Tabconsole / Tabpanel | ❌ | C1：强烈误导为 DevTools 调试工具 |
| **Tab Captain** | ❌ | **第二轮最强挑战者**：C3 最干净（Store 无同名，tabcaptain.com/.io 均可注册）、C4 2 音节、C5 人格感配动效。但 C1 失败：captain 与 pilot 同族，2026 语境易被预读为 AI copilot 类工具（与 Tabpilot 出局理由同构）；C2 失败：中文名「标签船长」不自解释品类；「替你指挥」的语义重心弱化「亲手操作」预期，按 §3 主张应驳回 |
| Tab Commander | ❌ | C3：[Tab Commander](https://chromewebstore.google.com/detail/tab-commander/hionageldjijhodeffdfbkecppfiadob) 在架 |
| Tab Master | ❌ | C3：至少 3 个同名在架（[Tab Master](https://chromewebstore.google.com/detail/tab-master/gbfklalklelnaghdibpajnadcgahnlln) ×2、TabMaster、Tab Master 5000），其一同为拖拽式管理器 |
| tabOS | ❌ | C3：[tabOS](https://chromewebstore.google.com/detail/tabos-tab-management-chat/kjmamngookndcomlilkjckmbcneipnop) 在架（4.6 星，tab 管理品类） |
| Tab Studio | ❌ | C3：无精确同名但近邻密集——[Tabs Studio](https://tabsstudio.com/)（VS 知名扩展 + 域名被占）、New Tab Studio ×2、Wix Studio Tab，搜索权重被瓜分 |
| Tab Central | ❌ | C3：[CentralTab](https://centraltab.com/) 在架且中文口语近音 |
| Tab HQ | ❌ | C2：HQ 缩写对非游戏圈中文用户认知弱、口语念「H-Q」不顺；tabhq.com 已被注册 |
| Tab Cockpit | ❌ | C2：cockpit 中文认知度低 |

**近邻提示**：Firefox 有知名扩展 **Tab Stash**，前缀相近但不同音，不构成撞名。

## 8. 竞品提醒：TabRack

[tabrack.com](https://tabrack.com/) 的功能列表与本产品核心能力高度重合：**按域名自动分组、去重、稍后阅读清单、local-first 本地优先**（另有 AI 摘要与内存丢弃，为本产品非目标）。

这是**定位冲突**而非单纯的名称冲突。本产品的差异点须落在：

1. **写穿式拖拽**——拖动同步真实 `tabs.move`，而非只读列表
2. **模式 × 视图正交**——窗口/全部 × 列表/域名，四种组合自由切换
3. **窗口会话模板式复用**——恢复后会话保留，可反复开
4. **零 AI、零网络**——仅 `tabs` + `storage` 权限

后续产品决策应持续验证以上差异点是否成立。

## 9. 旧名处置

`tabstage` 为定名前的临时初稿名，**已作废**。仓库内 `CLAUDE.md`、`CONTEXT.md`、`docs/specs/`、`docs/plans/`、`manifest.json`、`_locales/`、`src/lib/manager-url.ts` 等处的 `tabstage` 字样待统一替换为 `tabstation`（英文品牌名 `Tab Station`）。替换前，遇到 `tabstage` 一律理解为本产品。
