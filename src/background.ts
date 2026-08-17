import { MANAGER_PATH, ownPagePrefix } from './lib/urls';
import { findManagerTab } from './lib/singleton';
import {
  buildSuggestion,
  defaultDescription,
  escapeXml,
  matchOmnibox,
  parseContent,
  type OmniboxLabels,
} from './lib/omnibox';
import { visibleTabs } from './lib/grouping';
import { restoreSession } from './lib/restore-session';
import {
  mergeSettings,
  removeReadLater,
  type ReadLaterItem,
  type SavedSession,
  type Settings,
} from './lib/storage';
import { resolveLanguage, translate, type Language } from './i18n/resolve';
import en from './i18n/en.json';
import zhCN from './i18n/zh_CN.json';

// background：扩展的命令入口——图标点击/快捷键 → 管理页单例，地址栏关键字 → 搜索自有数据（spec §4.2、omnibox spec §8）
// service worker 随时休眠，不持有状态——每次都从 storage 读设置
export async function openManager(): Promise<void> {
  const url = chrome.runtime.getURL(MANAGER_PATH);
  const [{ settings }, current, tabs] = await Promise.all([
    chrome.storage.local.get('settings') as Promise<{
      settings?: { managerPageScope?: 'global' | 'per-window' };
    }>,
    chrome.windows.getLastFocused(),
    chrome.tabs.query({}),
  ]);
  const scope = settings?.managerPageScope ?? 'global';
  // 无聚焦窗口时（current.id 缺失或为 WINDOW_ID_NONE）统一按「无当前窗口」处理
  const currentWindowId =
    current.id === undefined || current.id === chrome.windows.WINDOW_ID_NONE
      ? chrome.windows.WINDOW_ID_NONE
      : current.id;
  const existing = findManagerTab(tabs, url, scope, currentWindowId);
  if (existing) {
    await chrome.windows.update(existing.windowId, { focused: true });
    if (existing.id !== undefined) await chrome.tabs.update(existing.id, { active: true });
  } else {
    await chrome.tabs.create(
      currentWindowId === chrome.windows.WINDOW_ID_NONE
        ? { url }
        : { url, windowId: currentWindowId },
    );
  }
}

// openManager 内部有 windows.update/tabs.update/tabs.create 等写操作，
// 快照与写入之间用户可能已手动关闭目标 tab/窗口，导致 reject；
// service worker 里的未捕获 rejection 没有页面可见、用户不会去看 console，
// 吞掉即可——点击图标无反应本身就是最坏情况的全部代价，不吞会更糟（无诊断且报错刷屏）
export async function safeOpenManager(): Promise<void> {
  try {
    await openManager();
  } catch {
    // 见上方注释：吞掉即可，避免变成 SW 里无人看见的静默失败
  }
}

chrome.action.onClicked.addListener(() => void safeOpenManager());
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-manager') void safeOpenManager();
});

// ===== 地址栏关键字 `ts`（omnibox spec 2026-08-17-omnibox-keyword.md）=====

interface StoredOmniData {
  readLater?: ReadLaterItem[];
  sessions?: SavedSession[];
  settings?: Partial<Settings>;
}

const dictionaries: Record<Language, Record<string, string>> = { en, 'zh-CN': zhCN };

// SW 无 React 上下文，useT 不可用——直接复用页面层同一份字典与插值逻辑（translate），
// 保证界面文案只有一处来源
function translatorFor(settings: Partial<Settings> | undefined) {
  const lang = resolveLanguage(mergeSettings(settings).language, navigator.language);
  const dict = dictionaries[lang];
  return (key: string, params?: Record<string, string | number>) => translate(dict, key, params);
}

async function handleOmniboxInputChanged(
  text: string,
  suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void,
): Promise<void> {
  const extBase = ownPagePrefix();
  const [tabs, stored] = await Promise.all([
    chrome.tabs.query({}),
    chrome.storage.local.get() as Promise<StoredOmniData>,
  ]);
  const items = matchOmnibox(text, {
    tabs: visibleTabs(tabs, extBase),
    readLater: stored.readLater ?? [],
    sessions: stored.sessions ?? [],
  });

  const t = translatorFor(stored.settings);
  const labels: OmniboxLabels = {
    tab: t('omnibox.typeTab'),
    read: t('omnibox.typeRead'),
    session: t('omnibox.typeSession'),
    tabCount: (n) => t('omnibox.sessionTabCount', { n }),
  };
  suggest(items.map((item) => buildSuggestion(item, text, labels)));

  chrome.omnibox.setDefaultSuggestion({
    description: defaultDescription(text, items.length, {
      empty: t('omnibox.defaultEmpty'),
      found: t('omnibox.defaultFound', { query: escapeXml(text.trim()), n: items.length }),
      none: t('omnibox.defaultNone'),
    }),
  });
}

// 三类执行语义与 disposition（spec §6.2）；写操作可能因目标已被关闭/删除而 reject，
// 沿用 safeOpenManager 的处理方式吞掉——用户重新搜一次即可（spec §9）
async function handleOmniboxInputEntered(
  content: string,
  disposition: `${chrome.omnibox.OnInputEnteredDisposition}`,
): Promise<void> {
  const parsed = parseContent(content);
  if (!parsed) {
    await safeOpenManager();
    return;
  }

  try {
    if (parsed.kind === 'tab') {
      const tabId = Number(parsed.id);
      const tab = await chrome.tabs.get(tabId);
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
      return;
    }

    if (parsed.kind === 'read') {
      const { readLater } = (await chrome.storage.local.get('readLater')) as StoredOmniData;
      const list = readLater ?? [];
      const item = list.find((r) => r.id === parsed.id);
      if (!item) {
        await safeOpenManager();
        return;
      }
      if (disposition === 'currentTab') {
        await chrome.tabs.update(undefined, { url: item.url });
      } else {
        await chrome.tabs.create({ url: item.url });
      }
      await chrome.storage.local.set({ readLater: removeReadLater(list, parsed.id) });
      return;
    }

    // kind === 'session'：恢复本就创建新窗口，disposition 无意义（spec §6.2）
    const { sessions, settings } = (await chrome.storage.local.get()) as StoredOmniData;
    const session = (sessions ?? []).find((s) => s.id === parsed.id);
    if (session) {
      await restoreSession(session, mergeSettings(settings).newWindowMode);
    }
  } catch {
    // 见上方注释：目标 tab/窗口/条目已不存在时吞掉即可
  }
}

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  void handleOmniboxInputChanged(text, suggest);
});
chrome.omnibox.onInputEntered.addListener((content, disposition) => {
  void handleOmniboxInputEntered(content, disposition);
});
