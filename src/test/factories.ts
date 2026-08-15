// 测试数据工厂：只填必要字段，其余给默认值
import type { TabWithId } from '../lib/dedupe';

let nextId = 1;

export function makeTab(partial: Partial<chrome.tabs.Tab> = {}): TabWithId {
  return {
    id: partial.id ?? nextId++,
    index: 0,
    windowId: 1,
    url: 'https://example.com/',
    title: 'Example',
    pinned: false,
    active: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    frozen: false,
    ...partial,
  } as TabWithId;
}

export function makeWindow(partial: Partial<chrome.windows.Window> = {}): chrome.windows.Window {
  return {
    id: partial.id ?? 1,
    focused: false,
    incognito: false,
    alwaysOnTop: false,
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
    ...partial,
  } as chrome.windows.Window;
}
