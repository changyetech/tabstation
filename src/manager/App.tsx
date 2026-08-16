import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import Toolbar, { type Mode } from '../components/Toolbar';
import Hero from '../components/Hero';
import WindowSection from '../components/WindowSection';
import DomainGroupList from '../components/DomainGroupList';
import ReadLaterSidebar from '../components/ReadLaterSidebar';
import SessionSection from '../components/SessionSection';
import Toast from '../components/Toast';
import { Icon } from '../components/icons';
import type { MoveTarget } from '../components/MoveMenu';
import { I18nProvider, resolveLanguage, useLanguage, useT } from '../i18n';
import { useStorageState } from '../hooks/useStorageState';
import { useTabs } from '../hooks/useTabs';
import { useTheme } from '../hooks/useTheme';
import { closeTabsWithEffect } from '../lib/effects/batch';
import { animateElementOut, undoAnimateElementOut, EXIT_MS } from '../lib/effects/exit';
import { playCloseSound } from '../lib/effects/sound';
import { shootConfetti } from '../lib/effects/confetti';
import { findDuplicateGroups, planDedupe, type TabWithId } from '../lib/dedupe';
import { dragEndToMove, type DragTabData } from '../lib/dnd';
import { domainGroupKey, hostnameOf, sortWindowsCurrentFirst, visibleTabs } from '../lib/grouping';
import { managerUrl } from '../lib/manager-url';
import { createWindowBySetting } from '../lib/open-window';
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  removeReadLater,
  removeSessionTab,
  renameSession,
  reorderSessionTab,
  snapshotWindow,
  upsertReadLater,
  type ReadLaterItem,
  type SavedSession,
  type SessionTab,
  type Settings,
} from '../lib/storage';

export default function App() {
  const [rawSettings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
  // 旧版本落盘数据可能缺新字段，读侧统一合并兜底
  const settings = mergeSettings(rawSettings);
  const language = resolveLanguage(settings.language, navigator.language);

  return (
    <I18nProvider language={language}>
      <AppInner settings={settings} />
    </I18nProvider>
  );
}

function AppInner({ settings }: { settings: Settings }) {
  const { tabs, windows, currentWindowId } = useTabs();
  const t = useT();
  const language = useLanguage();
  // 视图不可切换（spec §3.1 2026-08-16 修订）：窗口模式固定列表视图，全部模式固定域名视图
  const [mode, setMode] = useState<Mode>('window');
  const rowEls = useRef(new Map<number, HTMLElement>());
  useTheme(settings.theme);

  // 整行是拖拽把手，需位移阈值，否则行内按钮的 pointerdown 会被判成起拖
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 相对时间随 useTabs 的刷新一起更新，逐层下传；避免行内自持快照导致时间冻结。
  // setNow 放进 setTimeout 回调里调用（而非效果体顶层同步调用），
  // 以满足 react-hooks/set-state-in-effect 对「效果体内直接同步 setState」的限制
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, [tabs]);

  // 首屏进入动画只放一轮（设计稿 enter fadeUp），之后交给 view-switch
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  const mUrl = managerUrl();
  // 隐身范围 = 本扩展全部页面（管理页 + 设置页），前缀过滤（spec §3.2）
  const extBase = chrome.runtime.getURL('');
  const visible = useMemo(() => visibleTabs(tabs, extBase), [tabs, extBase]);
  const dupGroups = useMemo(() => findDuplicateGroups(visible, extBase), [visible, extBase]);
  const dupCountByTabId = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of dupGroups) for (const tab of g.tabs) m.set(tab.id, g.tabs.length);
    return m;
  }, [dupGroups]);

  // 一键去重（spec §5.4）：hover 常驻预览，点击无确认直接执行
  const [dedupePreview, setDedupePreview] = useState(false);
  const dedupePlan = useMemo(() => planDedupe(dupGroups), [dupGroups]);
  // 悬停任一重复行 → 同组高亮（keep/close 样式与预览一致）
  const [hoverDupTabId, setHoverDupTabId] = useState<number | null>(null);
  const previewByTabId = useMemo(() => {
    const m = new Map<number, 'keep' | 'close'>();
    const markPlan = (memberIds?: Set<number>) => {
      for (const id of dedupePlan.closeIds) if (!memberIds || memberIds.has(id)) m.set(id, 'close');
      for (const id of dedupePlan.keepIds) if (!memberIds || memberIds.has(id)) m.set(id, 'keep');
    };
    if (dedupePreview) {
      markPlan();
    } else if (hoverDupTabId !== null) {
      const group = dupGroups.find((g) => g.tabs.some((x) => x.id === hoverDupTabId));
      if (group) markPlan(new Set(group.tabs.map((x) => x.id)));
    }
    return m;
  }, [dedupePreview, hoverDupTabId, dedupePlan, dupGroups]);

  // 轻量 toast：2.5s 后自动清空；重复调用先清掉上一个定时器
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  };

  const runDedupe = () => {
    setDedupePreview(false);
    const n = dedupePlan.closeIds.length;
    if (n === 0) return;
    void closeTabsWithEffect(
      dedupePlan.closeIds.map((id) => ({ tabId: id, el: rowEls.current.get(id) ?? null })),
    ).then(() => showToast(t('toast.dedupeDone', { n })));
  };

  const registerRow = (tabId: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(tabId, el);
    else rowEls.current.delete(tabId);
  };

  const closeTab = (tab: TabWithId) =>
    void closeTabsWithEffect([{ tabId: tab.id, el: rowEls.current.get(tab.id) ?? null }]);

  const [readLater, setReadLater] = useStorageState<ReadLaterItem[]>('readLater', []);

  // 保存即关 tab（spec 沿用 §5.5）；同 URL 归一化合并在 upsertReadLater 内
  const saveReadLater = (tab: TabWithId) => {
    const url = tab.url;
    if (!url) return;
    void setReadLater(
      upsertReadLater(
        readLater,
        { url, title: tab.title ?? url, favIconUrl: tab.favIconUrl },
        Date.now(),
        crypto.randomUUID(),
      ),
    );
    void closeTabsWithEffect([{ tabId: tab.id, el: rowEls.current.get(tab.id) ?? null }]).then(() =>
      showToast(t('toast.readLaterSaved')),
    );
  };

  // 打开即移除（沿用旧 spec）
  const openReadLater = (item: ReadLaterItem) => {
    void chrome.tabs.create({ url: item.url });
    void setReadLater(removeReadLater(readLater, item.id));
  };

  // 新窗口打开：语义同「打开」，即从清单移除；尺寸遵循设置（spec §5.3）
  const openReadLaterNewWindow = (item: ReadLaterItem) => {
    void createWindowBySetting(settings.newWindowMode, { url: item.url, focused: true });
    void setReadLater(removeReadLater(readLater, item.id));
  };

  // 全部打开：一个新窗口开全部并清空清单（spec §5.5）
  const openAllReadLater = () => {
    const n = readLater.length;
    if (n === 0) return;
    void createWindowBySetting(settings.newWindowMode, {
      url: readLater.map((x) => x.url),
      focused: true,
    });
    void setReadLater([]);
    showToast(t('toast.rlOpenAll', { n }));
  };

  // 直接删除：仅退场动画，无音效/纸屑/确认
  const deleteReadLater = (item: ReadLaterItem, el: HTMLElement | null) => {
    const commit = () => void setReadLater(removeReadLater(readLater, item.id));
    if (el) animateElementOut(el, commit);
    else commit();
  };

  // 关闭窗口：区块级一次动效；管理页所在窗口只关其他 tab、保留管理页
  const closeWindow = (win: chrome.windows.Window, sectionEl: HTMLElement | null) => {
    const winVisible = visible.filter((x) => x.windowId === win.id);
    const containsManager = tabs.some((x) => x.windowId === win.id && x.url?.startsWith(mUrl));
    playCloseSound();
    if (sectionEl) {
      const rect = sectionEl.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      animateElementOut(sectionEl);
    }
    window.setTimeout(() => {
      if (containsManager) {
        void chrome.tabs.remove(winVisible.map((x) => x.id)).catch(() => {
          // 动画期间用户可能已手动关闭这些 tab，remove 会 reject；
          // 吞掉即可——useTabs 的事件驱动刷新会自愈状态
          // 但整个区块已经带上 .closing，remove 失败意味着窗口其实还活着，
          // 不摘掉的话这个区块会永久消失
          if (sectionEl) undoAnimateElementOut(sectionEl);
        });
      } else if (win.id !== undefined) {
        void chrome.windows.remove(win.id).catch(() => {
          if (sectionEl) undoAnimateElementOut(sectionEl);
        });
      }
    }, EXIT_MS);
  };

  const [sessions, setSessions] = useStorageState<SavedSession[]>('sessions', []);

  // 窗口序号按 getAll 顺序固定，不受置顶排序、也不受空窗口过滤影响
  const numberByWindowId = useMemo(() => new Map(windows.map((w, i) => [w.id, i + 1])), [windows]);
  const sortedWindows = useMemo(
    () => sortWindowsCurrentFirst(windows, currentWindowId),
    [windows, currentWindowId],
  );
  // 管理页隐身后可能一个可见 tab 都不剩（如管理页独占一个窗口），这类窗口不渲染
  const windowsWithTabs = useMemo(
    () =>
      sortedWindows
        .map((w) => ({
          window: w,
          tabs: visible.filter((tab) => tab.windowId === w.id).sort((a, b) => a.index - b.index),
        }))
        .filter((entry) => entry.tabs.length > 0),
    [sortedWindows, visible],
  );

  // 全部模式：按窗口顺序 + index 合并
  const mergedTabs = useMemo(() => {
    const order = new Map(windows.map((w, i) => [w.id, i]));
    return [...visible].sort(
      (a, b) => (order.get(a.windowId) ?? 0) - (order.get(b.windowId) ?? 0) || a.index - b.index,
    );
  }, [visible, windows]);

  // 点击即保存无弹窗（沿用旧 spec §5.5）；空快照 → toast 且不创建
  const saveWindow = (win: chrome.windows.Window) => {
    const winTabs = tabs.filter((x) => x.windowId === win.id).sort((a, b) => a.index - b.index);
    const snapshot = snapshotWindow(winTabs, extBase);
    if (snapshot.length === 0) {
      showToast(t('sessions.emptySnapshot'));
      return;
    }
    const savedAt = Date.now();
    void setSessions([
      ...sessions,
      {
        id: crypto.randomUUID(),
        // 默认名 = 保存日期时间
        name: new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' }).format(
          savedAt,
        ),
        createdAt: savedAt,
        tabs: snapshot,
      },
    ]);
    const n = numberByWindowId.get(win.id) ?? 0;
    if (settings.closeWindowAfterSave) {
      closeWindow(win, null);
      showToast(t('toast.sessionSavedClosed', { n }));
    } else {
      showToast(t('toast.sessionSaved', { n }));
    }
  };

  // 恢复：新窗口按当前顺序全量打开并还原 pinned；会话保留（模板式）；尺寸遵循设置
  const restoreSession = async (s: SavedSession) => {
    const win = await createWindowBySetting(settings.newWindowMode, {
      url: s.tabs.map((x) => x.url),
      focused: true,
    });
    const created = win?.tabs ?? [];
    await Promise.all(
      s.tabs.map((st, i) => {
        const id = created[i]?.id;
        if (!st.pinned || id === undefined) return Promise.resolve();
        return chrome.tabs.update(id, { pinned: true });
      }),
    );
  };

  const deleteSession = (s: SavedSession) =>
    void setSessions(sessions.filter((x) => x.id !== s.id));
  const handleRename = (s: SavedSession, name: string) =>
    void setSessions(renameSession(sessions, s.id, name));
  const handleReorderTab = (s: SavedSession, from: number, to: number) =>
    void setSessions(reorderSessionTab(sessions, s.id, from, to));
  const handleDeleteTab = (s: SavedSession, index: number) =>
    void setSessions(removeSessionTab(sessions, s.id, index)); // 删空自动删会话（storage.ts 保证）
  const openSessionTab = (tab: SessionTab) => void chrome.tabs.create({ url: tab.url });
  // 会话条目「新窗口打开」：条目保留（模板式）；尺寸遵循设置
  const openSessionTabNewWindow = (tab: SessionTab) => {
    void createWindowBySetting(settings.newWindowMode, { url: tab.url, focused: true });
    showToast(t('toast.split'));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    // data.current 的类型是 dnd-kit 定死的 Record<string, any>，属库边界；
    // 这里的具体形状由 TabRow 的 useSortable({ data }) 保证
    const move = dragEndToMove(
      e.active.data.current as DragTabData,
      (e.over?.data.current as DragTabData | undefined) ?? null,
    );
    if (move) void chrome.tabs.move(move.tabId, { windowId: move.windowId, index: move.index });
  };

  // 展示条数折叠的展开集合（会话内存状态，不落盘）
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const toggleExpand = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // 移动目标：除源窗口外的其他所有窗口（设计稿 move-menu：窗口 N · 标题截断 + 数量）
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);
  const getMoveTargets = (tab: TabWithId): MoveTarget[] =>
    windows.flatMap((w) => {
      if (w.id === undefined || w.id === tab.windowId) return [];
      const winTabs = visible.filter((x) => x.windowId === w.id);
      if (winTabs.length === 0) return [];
      const title = winTabs.find((x) => x.active)?.title ?? winTabs[0]?.title ?? '';
      return [
        {
          windowId: w.id,
          label: `${t('window.label', { n: numberByWindowId.get(w.id) ?? 0 })} · ${clip(title, 12)}`,
          tabCount: winTabs.length,
        },
      ];
    });

  const moveTab = async (tab: TabWithId, target: MoveTarget) => {
    await chrome.tabs.move(tab.id, { windowId: target.windowId, index: -1 });
    showToast(t('toast.movedToWindow', { n: numberByWindowId.get(target.windowId) ?? 0 }));
  };

  // 拆到新窗口（spec §5.3）：单 tab 挪进按设置尺寸新建的窗口
  const splitTab = async (tab: TabWithId) => {
    await createWindowBySetting(settings.newWindowMode, {
      tabId: tab.id,
      sourceWindowId: tab.windowId,
    });
    showToast(t('toast.split'));
  };

  // 新建空窗口（设计稿 new-win 幽灵按钮）
  const newWindow = () => {
    void createWindowBySetting(settings.newWindowMode, {});
    showToast(t('toast.newWindow'));
  };

  // ===== 域名批量操作（spec §5.1）=====
  const domainHostLabel = (batch: TabWithId[]) =>
    hostnameOf(batch[0]?.url) || domainGroupKey(batch[0]?.url ?? '').slice(1);

  const domainReadLater = (batch: TabWithId[]) => {
    const targets = batch.filter((x) => !x.pinned && /^https?:\/\//.test(x.url ?? ''));
    if (targets.length === 0) {
      showToast(t('toast.domOnlyPinned'));
      return;
    }
    let list = readLater;
    const savedAt = Date.now();
    for (const tab of targets) {
      list = upsertReadLater(
        list,
        { url: tab.url ?? '', title: tab.title ?? tab.url ?? '', favIconUrl: tab.favIconUrl },
        savedAt,
        crypto.randomUUID(),
      );
    }
    void setReadLater(list);
    const host = domainHostLabel(targets);
    void closeTabsWithEffect(
      targets.map((x) => ({ tabId: x.id, el: rowEls.current.get(x.id) ?? null })),
    ).then(() => showToast(t('toast.domReadLater', { host, n: targets.length })));
  };

  const domainCloseAll = (batch: TabWithId[]) => {
    const targets = batch.filter((x) => !x.pinned);
    if (targets.length === 0) {
      showToast(t('toast.domOnlyPinned'));
      return;
    }
    const host = domainHostLabel(targets);
    void closeTabsWithEffect(
      targets.map((x) => ({ tabId: x.id, el: rowEls.current.get(x.id) ?? null })),
    ).then(() => showToast(t('toast.domClosed', { host, n: targets.length })));
  };

  // 整域名拆到新窗口：含 pinned（设计稿语义）；move 后还原 pinned 态
  const domainSplit = async (batch: TabWithId[]) => {
    if (batch.length === 0) return;
    const [first, ...rest] = batch;
    const win = await createWindowBySetting(settings.newWindowMode, {
      tabId: first.id,
      sourceWindowId: first.windowId,
    });
    if (win?.id !== undefined && rest.length > 0) {
      await chrome.tabs.move(
        rest.map((x) => x.id),
        { windowId: win.id, index: -1 },
      );
    }
    await Promise.all(
      batch.filter((x) => x.pinned).map((x) => chrome.tabs.update(x.id, { pinned: true })),
    );
    showToast(t('toast.domSplit', { host: domainHostLabel(batch), n: batch.length }));
  };

  // ===== 渲染 =====
  const stats = {
    windows: windowsWithTabs.length,
    tabs: visible.length,
    domains: new Set(visible.map((x) => domainGroupKey(x.url ?? ''))).size,
    dupGroups: dupGroups.length,
    readLater: readLater.length,
  };

  const draggable = mode === 'window' && !dedupePreview;
  // 去重预览时无成员的窗口区块整体隐藏
  const previewWindows = dedupePreview
    ? windowsWithTabs.filter((entry) => entry.tabs.some((x) => previewByTabId.has(x.id)))
    : windowsWithTabs;

  const shared = {
    now,
    dupCountByTabId,
    previewByTabId,
    dedupePreview,
    registerRow,
    onCloseTab: closeTab,
    getMoveTargets,
    onMove: (tab: TabWithId, target: MoveTarget) => void moveTab(tab, target),
    onReadLater: saveReadLater,
    onSplit: (tab: TabWithId) => void splitTab(tab),
    onHoverDup: setHoverDupTabId,
    onDomainReadLater: domainReadLater,
    onDomainSplit: (batch: TabWithId[]) => void domainSplit(batch),
    onDomainCloseAll: domainCloseAll,
  };

  return (
    <>
      <Hero stats={stats} />
      <Toolbar
        mode={mode}
        onMode={setMode}
        dedupeCloseCount={dedupePlan.closeIds.length}
        onDedupe={runDedupe}
        onDedupeHover={setDedupePreview}
      />
      {/* 稍后阅读为空 → 侧栏整个不渲染，主区满宽（spec §3.1） */}
      <div className={`layout${readLater.length === 0 ? ' no-aside' : ''}`}>
        {/* key 随模式变化 → 重挂载重放 viewIn 过场（设计稿 view-switch） */}
        <main className="main view-switch" key={mode}>
          {mode === 'sessions' ? (
            // 已保存会话：主区第三模式，win-block 同款卡片（spec §5.5 2026-08-16 修订）
            <SessionSection
              sessions={sessions}
              visibleLimit={settings.visibleTabs}
              expandedKeys={expandedKeys}
              onToggleExpand={toggleExpand}
              onRestore={(s) => void restoreSession(s)}
              onDelete={deleteSession}
              onRename={handleRename}
              onReorderTab={handleReorderTab}
              onDeleteTab={handleDeleteTab}
              onOpenTab={openSessionTab}
              onOpenTabNewWindow={openSessionTabNewWindow}
            />
          ) : windowsWithTabs.length === 0 ? (
            <>
              <div className="empty-all">
                <span className="icon">
                  <Icon name="sparkle" size={16} />
                </span>
                <br />
                {t('empty.allClear')}
              </div>
              <div className="empty-all-newwin">
                <button className="new-win" onClick={newWindow}>
                  <Icon name="winNew" size={13} />
                  {t('newWindow')}
                </button>
              </div>
            </>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {mode === 'window' ? (
                <>
                  <div className={entered ? 'win-flow' : 'win-flow enter'}>
                    {previewWindows.map(({ window: w, tabs: winTabs }) => (
                      <WindowSection
                        key={w.id}
                        window={w}
                        windowNumber={numberByWindowId.get(w.id) ?? 0}
                        tabs={winTabs}
                        isCurrent={w.id === currentWindowId}
                        draggable={draggable}
                        visibleLimit={settings.visibleTabs}
                        expandedKeys={expandedKeys}
                        onToggleExpand={toggleExpand}
                        onCloseWindow={closeWindow}
                        onSaveWindow={saveWindow}
                        {...shared}
                      />
                    ))}
                    {!dedupePreview && (
                      <button className="new-win" onClick={newWindow}>
                        <Icon name="winNew" size={13} />
                        {t('newWindow')}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <DomainGroupList
                  tabs={mergedTabs}
                  visibleLimit={settings.visibleTabs}
                  expandedKeys={expandedKeys}
                  onToggleExpand={toggleExpand}
                  {...shared}
                />
              )}
            </DndContext>
          )}
        </main>
        {readLater.length > 0 && (
          <aside>
            <ReadLaterSidebar
              items={readLater}
              now={now}
              onOpen={openReadLater}
              onOpenNewWindow={openReadLaterNewWindow}
              onOpenAll={openAllReadLater}
              onDelete={deleteReadLater}
            />
          </aside>
        )}
      </div>
      <Toast message={toast} />
    </>
  );
}
