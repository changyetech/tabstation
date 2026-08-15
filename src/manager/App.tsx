import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Toolbar, { type Mode, type View } from '../components/Toolbar';
import WindowSection from '../components/WindowSection';
import TabRow from '../components/TabRow';
import { I18nProvider, resolveLanguage } from '../i18n';
import { useStorageState } from '../hooks/useStorageState';
import { useTabs } from '../hooks/useTabs';
import { closeTabsWithEffect } from '../lib/effects/batch';
import { findDuplicateGroups, type TabWithId } from '../lib/dedupe';
import { dragEndToMove, type DragTabData } from '../lib/dnd';
import { sortWindowsCurrentFirst, visibleTabs } from '../lib/grouping';
import { managerUrl } from '../lib/manager-url';
import { DEFAULT_SETTINGS, type Settings } from '../lib/storage';

export default function App() {
  const { tabs, windows, currentWindowId } = useTabs();
  const [settings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
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

  const registerRow = (tabId: number, el: HTMLElement | null) => {
    if (el) rowEls.current.set(tabId, el);
    else rowEls.current.delete(tabId);
  };

  const closeTab = (tab: TabWithId) =>
    void closeTabsWithEffect([{ tabId: tab.id, el: rowEls.current.get(tab.id) ?? null }]);

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

  const language = resolveLanguage(settings.language, navigator.language);

  return (
    <I18nProvider language={language}>
      <Toolbar mode={mode} view={view} onMode={setMode} onView={setView} />
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
                dupCountByTabId={dupCountByTabId}
                now={now}
                registerRow={registerRow}
                onCloseTab={closeTab}
              />
            ))
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
                    draggable={false}
                    now={now}
                    registerRow={registerRow}
                    onClose={closeTab}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </DndContext>
      </main>
    </I18nProvider>
  );
}
