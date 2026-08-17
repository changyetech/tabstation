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
        (t.title?.toLowerCase().includes(normalized) ?? false) ||
        (t.url?.toLowerCase().includes(normalized) ?? false),
    )
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))
    .slice(0, 3)
    .map((t): OmniItem => ({
      kind: 'tab',
      tabId: t.id!,
      windowId: t.windowId,
      title: t.title!,
      url: t.url!,
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

export function buildSuggestion(item: OmniItem, query: string): chrome.omnibox.SuggestResult {
  const lowerQuery = query.toLowerCase();

  if (item.kind === 'tab') {
    // 先转义，后插 match 标记
    const escapedTitle = escapeXml(item.title);
    const escapedHostname = escapeXml(hostnameOf(item.url));

    let titleWithMatch = escapedTitle;
    const titleIndex = escapedTitle.toLowerCase().indexOf(lowerQuery);
    if (titleIndex !== -1) {
      titleWithMatch =
        escapedTitle.slice(0, titleIndex) +
        `<match>${escapedTitle.slice(titleIndex, titleIndex + query.length)}</match>` +
        escapedTitle.slice(titleIndex + query.length);
    }

    let hostnameWithMatch = escapedHostname;
    const hostnameIndex = escapedHostname.toLowerCase().indexOf(lowerQuery);
    if (hostnameIndex !== -1) {
      hostnameWithMatch =
        escapedHostname.slice(0, hostnameIndex) +
        `<match>${escapedHostname.slice(hostnameIndex, hostnameIndex + query.length)}</match>` +
        escapedHostname.slice(hostnameIndex + query.length);
    }

    const description = `<dim>标签页</dim> ${titleWithMatch} <url>${hostnameWithMatch}</url>`;
    return {
      content: toContent(item),
      description,
    };
  }

  if (item.kind === 'read') {
    const escapedTitle = escapeXml(item.title);
    const escapedHostname = escapeXml(hostnameOf(item.url));

    let titleWithMatch = escapedTitle;
    const titleIndex = escapedTitle.toLowerCase().indexOf(lowerQuery);
    if (titleIndex !== -1) {
      titleWithMatch =
        escapedTitle.slice(0, titleIndex) +
        `<match>${escapedTitle.slice(titleIndex, titleIndex + query.length)}</match>` +
        escapedTitle.slice(titleIndex + query.length);
    }

    let hostnameWithMatch = escapedHostname;
    const hostnameIndex = escapedHostname.toLowerCase().indexOf(lowerQuery);
    if (hostnameIndex !== -1) {
      hostnameWithMatch =
        escapedHostname.slice(0, hostnameIndex) +
        `<match>${escapedHostname.slice(hostnameIndex, hostnameIndex + query.length)}</match>` +
        escapedHostname.slice(hostnameIndex + query.length);
    }

    const description = `<dim>稍后阅读</dim> ${titleWithMatch} <url>${hostnameWithMatch}</url>`;
    return {
      content: toContent(item),
      description,
    };
  }

  // kind === 'session'
  const escapedName = escapeXml(item.name);
  let nameWithMatch = escapedName;
  const nameIndex = escapedName.toLowerCase().indexOf(lowerQuery);
  if (nameIndex !== -1) {
    nameWithMatch =
      escapedName.slice(0, nameIndex) +
      `<match>${escapedName.slice(nameIndex, nameIndex + query.length)}</match>` +
      escapedName.slice(nameIndex + query.length);
  }

  const description = `<dim>会话</dim> ${nameWithMatch} <dim>${item.tabCount} 个标签页</dim>`;
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

export function defaultDescription(input: string, count: number): string {
  const normalized = input.trim();
  if (!normalized) {
    return '搜索标签页、稍后阅读与会话';
  }
  if (count > 0) {
    return `搜索「${normalized}」 · 找到 ${count} 项`;
  }
  return '没有匹配项 · 回车打开 Tab Station';
}
