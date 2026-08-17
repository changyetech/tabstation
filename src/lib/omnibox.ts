import { type ReadLaterItem, type SavedSession } from './storage';
import { hostnameOf } from './grouping';

export type OmniItem =
  | { kind: 'tab'; tabId: number; windowId: number; title: string; url: string }
  | { kind: 'read'; id: string; title: string; url: string }
  | { kind: 'session'; id: string; name: string; tabCount: number };

export interface OmniSource {
  tabs: chrome.tabs.Tab[];
  readLater: ReadLaterItem[];
  sessions: SavedSession[];
}

export function matchOmnibox(input: string, source: OmniSource): OmniItem[] {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return [];

  // 过滤与排序各类
  const matchedTabs = source.tabs
    .filter(
      (t) =>
        t.id &&
        ((t.title?.toLowerCase().includes(normalized) ?? false) ||
          (t.url?.toLowerCase().includes(normalized) ?? false)),
    )
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
    .slice(0, 3)
    .map((t): OmniItem => ({
      kind: 'tab',
      tabId: t.id!,
      windowId: t.windowId,
      title: t.title || t.url || 'Unknown',
      url: t.url || '',
    }));

  const matchedReads = source.readLater
    .filter(
      (r) => r.title.toLowerCase().includes(normalized) || r.url.toLowerCase().includes(normalized),
    )
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, 3)
    .map((r): OmniItem => ({
      kind: 'read',
      id: r.id,
      title: r.title,
      url: r.url,
    }));

  const matchedSessions = source.sessions
    .filter((s) => s.name.toLowerCase().includes(normalized))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
    .map((s): OmniItem => ({
      kind: 'session',
      id: s.id,
      name: s.name,
      tabCount: s.tabs.length,
    }));

  return [...matchedTabs, ...matchedReads, ...matchedSessions].slice(0, 6);
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 在原始文本中查找匹配，逐段转义后才插 match 标记，避免标记跨越转义实体
function highlightMatch(text: string, query: string): string {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return escapeXml(text);
  }

  const pre = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const post = text.slice(index + query.length);

  return escapeXml(pre) + `<match>${escapeXml(match)}</match>` + escapeXml(post);
}

// 三类的行内类型标签；background 在 service worker 中按语言注入翻译后的文案，
// 页面外（如单测）不传时落回中文——保持与 spec §5.1 字面表格一致
export interface OmniboxLabels {
  tab: string;
  read: string;
  session: string;
}

const DEFAULT_LABELS: OmniboxLabels = { tab: '标签页', read: '稍后阅读', session: '会话' };

export function buildSuggestion(
  item: OmniItem,
  query: string,
  labels: OmniboxLabels = DEFAULT_LABELS,
): chrome.omnibox.SuggestResult {
  if (item.kind === 'tab') {
    const titleWithMatch = highlightMatch(item.title, query);
    const hostname = hostnameOf(item.url);
    const hostnameWithMatch = highlightMatch(hostname, query);

    const description = `<dim>${labels.tab}</dim> ${titleWithMatch} <url>${hostnameWithMatch}</url>`;
    return {
      content: toContent(item),
      description,
    };
  }

  if (item.kind === 'read') {
    const titleWithMatch = highlightMatch(item.title, query);
    const hostname = hostnameOf(item.url);
    const hostnameWithMatch = highlightMatch(hostname, query);

    const description = `<dim>${labels.read}</dim> ${titleWithMatch} <url>${hostnameWithMatch}</url>`;
    return {
      content: toContent(item),
      description,
    };
  }

  // kind === 'session'
  const nameWithMatch = highlightMatch(item.name, query);

  const description = `<dim>${labels.session}</dim> ${nameWithMatch} <dim>${item.tabCount} 个标签页</dim>`;
  return {
    content: toContent(item),
    description,
  };
}

export function toContent(item: OmniItem): string {
  if (item.kind === 'tab') {
    return `tab:${item.tabId}`;
  }
  return `${item.kind}:${item.id}`;
}

export function parseContent(content: string): { kind: OmniItem['kind']; id: string } | null {
  const parts = content.split(':');
  if (parts.length !== 2) return null;

  const kind = parts[0];
  const id = parts[1];

  if (kind === 'tab' || kind === 'read' || kind === 'session') {
    return { kind: kind as OmniItem['kind'], id };
  }

  return null;
}

// 三态默认建议文案；background 按语言现场 translate() 后传入，
// 未传时落回中文默认值——与 spec §5.3 字面表格一致
export interface DefaultSuggestionStrings {
  empty: string;
  found: string;
  none: string;
}

export function defaultDescription(
  input: string,
  count: number,
  strings: DefaultSuggestionStrings = {
    empty: '搜索标签页、稍后阅读与会话',
    found: `搜索「${input.trim()}」 · 找到 ${count} 项`,
    none: '没有匹配项 · 回车打开 Tab Station',
  },
): string {
  const normalized = input.trim();
  if (!normalized) {
    return strings.empty;
  }
  if (count > 0) {
    return strings.found;
  }
  return strings.none;
}
