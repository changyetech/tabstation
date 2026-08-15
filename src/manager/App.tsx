import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Toolbar, { type Mode, type View } from '../components/Toolbar';
import WindowSection from '../components/WindowSection';
import DomainGroupList from '../components/DomainGroupList';
import TabRow from '../components/TabRow';
import type { MoveTarget } from '../components/MoveMenu';
import { I18nProvider, resolveLanguage, useT } from '../i18n';
import { useStorageState } from '../hooks/useStorageState';
import { useTabs } from '../hooks/useTabs';
import { closeTabsWithEffect } from '../lib/effects/batch';
import { animateElementOut, EXIT_MS } from '../lib/effects/exit';
import { playCloseSound } from '../lib/effects/sound';
import { shootConfetti } from '../lib/effects/confetti';
import { findDuplicateGroups, planDedupe, type TabWithId } from '../lib/dedupe';
import { dragEndToMove, type DragTabData } from '../lib/dnd';
import { sortWindowsCurrentFirst, visibleTabs } from '../lib/grouping';
import { managerUrl } from '../lib/manager-url';
import { DEFAULT_SETTINGS, type Settings } from '../lib/storage';

export default function App() {
  const [settings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
  const language = resolveLanguage(settings.language, navigator.language);

  return (
    <I18nProvider language={language}>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  const { tabs, windows, currentWindowId } = useTabs();
  const t = useT();
  const [mode, setMode] = useState<Mode>('window');
  const [view, setView] = useState<View>('list');
  const rowEls = useRef(new Map<number, HTMLElement>());

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

  const mUrl = managerUrl();
  const visible = useMemo(() => visibleTabs(tabs, mUrl), [tabs, mUrl]);
  const dupGroups = useMemo(() => findDuplicateGroups(visible, mUrl), [visible, mUrl]);
  const dupCountByTabId = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of dupGroups) for (const tab of g.tabs) m.set(tab.id, g.tabs.length);
    return m;
  }, [dupGroups]);

  // 一键去重（spec §5.6）：hover 常驻预览，点击无确认直接执行
  const [dedupePreview, setDedupePreview] = useState(false);
  const dedupePlan = useMemo(() => planDedupe(dupGroups), [dupGroups]);
  const previewByTabId = useMemo(() => {
    const m = new Map<number, 'keep' | 'close'>();
    if (!dedupePreview) return m;
    dedupePlan.closeIds.forEach((id) => m.set(id, 'close'));
    dedupePlan.keepIds.forEach((id) => m.set(id, 'keep'));
    return m;
  }, [dedupePreview, dedupePlan]);

  const runDedupe = () => {
    setDedupePreview(false);
    void closeTabsWithEffect(
      dedupePlan.closeIds.map((id) => ({ tabId: id, el: rowEls.current.get(id) ?? null })),
    );
  };

  const registerRow = (tabId: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(tabId, el);
    else rowEls.current.delete(tabId);
  };

  const closeTab = (tab: TabWithId) =>
    void closeTabsWithEffect([{ tabId: tab.id, el: rowEls.current.get(tab.id) ?? null }]);

  // 关闭窗口：区块级一次动效；管理页所在窗口只关其他 tab、保留管理页（spec §4.3）
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
        });
      } else if (win.id !== undefined) {
        void chrome.windows.remove(win.id).catch(() => {
          // 动画期间用户可能已手动关闭该窗口，remove 会 reject；
          // 吞掉即可——useTabs 的事件驱动刷新会自愈状态
        });
      }
    }, EXIT_MS);
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

  // 窗口序号按 getAll 顺序固定，不受置顶排序、也不受空窗口过滤影响（spec §5.1）
  const numberByWindowId = useMemo(() => new Map(windows.map((w, i) => [w.id, i + 1])), [windows]);
  const sortedWindows = sortWindowsCurrentFirst(windows, currentWindowId);
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

  // 移动目标：除源窗口外的其他所有窗口（标识同 §4.3）+ 两种新窗口
  const getMoveTargets = (tab: TabWithId): MoveTarget[] => {
    const others = windows.flatMap((w) => {
      if (w.id === undefined || w.id === tab.windowId) return [];
      const winTabs = visible.filter((x) => x.windowId === w.id);
      const activeTitle = winTabs.find((x) => x.active)?.title ?? winTabs[0]?.title ?? '';
      return [
        {
          kind: 'window' as const,
          windowId: w.id,
          label: `${t('window.label', { n: numberByWindowId.get(w.id) ?? 0 })} · ${activeTitle} (${t('window.tabCount', { n: winTabs.length })})`,
        },
      ];
    });
    return [...others, { kind: 'new-maximized' }, { kind: 'new-same-size' }];
  };

  const moveTab = async (tab: TabWithId, target: MoveTarget) => {
    if (target.kind === 'window') {
      await chrome.tabs.move(tab.id, { windowId: target.windowId, index: -1 });
    } else if (target.kind === 'new-maximized') {
      const win = await chrome.windows.create({ tabId: tab.id });
      if (win?.id !== undefined) await chrome.windows.update(win.id, { state: 'maximized' });
    } else {
      const src = await chrome.windows.get(tab.windowId);
      await chrome.windows.create({
        tabId: tab.id,
        left: (src.left ?? 0) + 40,
        top: (src.top ?? 0) + 40,
        width: src.width,
        height: src.height,
      });
    }
  };

  return (
    <>
      <Toolbar
        mode={mode}
        view={view}
        onMode={setMode}
        onView={setView}
        onDedupe={runDedupe}
        onDedupeHover={setDedupePreview}
      />
      <main className="main">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {mode === 'window' ? (
            windowsWithTabs.map(({ window: w, tabs: winTabs }) => (
              <WindowSection
                key={w.id}
                window={w}
                windowNumber={numberByWindowId.get(w.id) ?? 0}
                tabs={winTabs}
                isCurrent={w.id === currentWindowId}
                draggable={view === 'list'}
                view={view}
                dupCountByTabId={dupCountByTabId}
                previewByTabId={previewByTabId}
                now={now}
                registerRow={registerRow}
                onCloseTab={closeTab}
                getMoveTargets={getMoveTargets}
                onMove={moveTab}
                onCloseWindow={closeWindow}
              />
            ))
          ) : view === 'domain' ? (
            <DomainGroupList
              tabs={mergedTabs}
              now={now}
              dupCountByTabId={dupCountByTabId}
              previewByTabId={previewByTabId}
              registerRow={registerRow}
              onCloseTab={closeTab}
              getMoveTargets={getMoveTargets}
              onMove={moveTab}
            />
          ) : (
            <SortableContext
              items={mergedTabs.map((x) => x.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="tab-list">
                {mergedTabs.map((tab) => (
                  <TabRow
                    key={tab.id}
                    tab={tab}
                    dupCount={dupCountByTabId.get(tab.id)}
                    dupPreview={previewByTabId.get(tab.id)}
                    draggable={false}
                    now={now}
                    registerRow={registerRow}
                    onClose={closeTab}
                    getMoveTargets={getMoveTargets}
                    onMove={moveTab}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </DndContext>
      </main>
    </>
  );
}
