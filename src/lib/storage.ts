import { normalizeUrl } from './url';

// ===== 数据模型（spec §6）=====

export interface ReadLaterItem {
  id: string;
  url: string;
  title: string;
  favIconUrl?: string;
  savedAt: number;
}

export interface SessionTab {
  url: string;
  title: string;
  favIconUrl?: string;
  pinned?: boolean;
}

export interface SavedSession {
  id: string;
  name: string;
  createdAt: number;
  tabs: SessionTab[];
}

export interface Settings {
  managerPageScope: 'global' | 'per-window';
  closeWindowAfterSave: boolean;
  language: 'auto' | 'en' | 'zh-CN';
  theme: 'light' | 'dark' | 'auto';
  newWindowMode: 'max' | 'same';
  visibleTabs: 8 | 12 | 16 | 'all';
  /** 管理页/新标签页打开时进入的视图 */
  defaultView: 'all' | 'window';
}

export const DEFAULT_SETTINGS: Settings = {
  managerPageScope: 'global',
  closeWindowAfterSave: false,
  language: 'auto',
  theme: 'auto',
  newWindowMode: 'same',
  visibleTabs: 12,
  defaultView: 'all',
};

// 旧版本落盘的 settings 缺新增字段，读侧统一经此合并兜底
export function mergeSettings(partial: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...partial };
}

// ===== 稍后阅读纯操作（spec §5.4）=====

// 归一化后同 URL 只更新 savedAt（不重复）；否则追加
export function upsertReadLater(
  list: ReadLaterItem[],
  tab: { url: string; title: string; favIconUrl?: string },
  now: number,
  newId: string,
): ReadLaterItem[] {
  const key = normalizeUrl(tab.url);
  const existing = list.find((i) => normalizeUrl(i.url) === key);
  if (existing) return list.map((i) => (i === existing ? { ...i, savedAt: now } : i));
  return [
    ...list,
    { id: newId, url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, savedAt: now },
  ];
}

export function removeReadLater(list: ReadLaterItem[], id: string): ReadLaterItem[] {
  return list.filter((i) => i.id !== id);
}

// ===== 会话纯操作（spec §5.5）=====

// 快照过滤：排除管理页自身与 chrome://；记录 pinned
export function snapshotWindow(tabs: chrome.tabs.Tab[], managerUrl: string): SessionTab[] {
  return tabs.flatMap((t) => {
    const url = t.url;
    if (!url || url.startsWith(managerUrl) || url.startsWith('chrome://')) return [];
    return [
      {
        url,
        title: t.title ?? url,
        favIconUrl: t.favIconUrl,
        ...(t.pinned ? { pinned: true as const } : {}),
      },
    ];
  });
}

// 删条目；删到空自动删除整个会话（不留空会话）
export function removeSessionTab(
  sessions: SavedSession[],
  sessionId: string,
  index: number,
): SavedSession[] {
  return sessions.flatMap((s) => {
    if (s.id !== sessionId) return [s];
    const tabs = s.tabs.filter((_, i) => i !== index);
    return tabs.length === 0 ? [] : [{ ...s, tabs }];
  });
}

// 同/跨会话移动条目（spec 2026-08-16-session-card-dnd §3.3）：
// 跨会话为「源删除 + 目标落点插入」；源拖空则会话消亡（与删空规则一致）；
// id 不存在或下标越界（陈旧拖拽状态）原样返回
export function moveSessionTab(
  sessions: SavedSession[],
  fromSessionId: string,
  fromIndex: number,
  toSessionId: string,
  toIndex: number,
): SavedSession[] {
  const from = sessions.find((s) => s.id === fromSessionId);
  const to = sessions.find((s) => s.id === toSessionId);
  if (!from || !to) return sessions;
  if (fromIndex < 0 || fromIndex >= from.tabs.length) return sessions;
  // 同会话落点上限 len-1（移动），跨会话允许 len（尾部追加）
  const maxTo = fromSessionId === toSessionId ? to.tabs.length - 1 : to.tabs.length;
  if (toIndex < 0 || toIndex > maxTo) return sessions;
  if (fromSessionId === toSessionId) {
    if (fromIndex === toIndex) return sessions;
    const tabs = [...from.tabs];
    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    return sessions.map((s) => (s.id === fromSessionId ? { ...s, tabs } : s));
  }
  const moved = from.tabs[fromIndex];
  const fromTabs = from.tabs.filter((_, i) => i !== fromIndex);
  const toTabs = [...to.tabs];
  toTabs.splice(toIndex, 0, moved);
  return sessions.flatMap((s) => {
    if (s.id === fromSessionId) return fromTabs.length === 0 ? [] : [{ ...s, tabs: fromTabs }];
    if (s.id === toSessionId) return [{ ...s, tabs: toTabs }];
    return [s];
  });
}

export function renameSession(
  sessions: SavedSession[],
  sessionId: string,
  name: string,
): SavedSession[] {
  return sessions.map((s) => (s.id === sessionId ? { ...s, name } : s));
}

// ===== storage IO 薄层 =====

export type StorageKey = 'readLater' | 'sessions' | 'settings';

export async function readKey<T>(key: StorageKey, fallback: T): Promise<T> {
  const res = await chrome.storage.local.get(key);
  return (res[key] as T | undefined) ?? fallback;
}

export async function writeKey<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
