import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import {
  domainGroupKey,
  groupByDomain,
  hostnameOf,
  sortWindowsCurrentFirst,
  visibleTabs,
} from './grouping';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('visibleTabs', () => {
  it('过滤掉管理页自身', () => {
    const tabs = [makeTab({ id: 1, url: MANAGER }), makeTab({ id: 2, url: 'https://a.com/' })];
    expect(visibleTabs(tabs, MANAGER).map((t) => t.id)).toEqual([2]);
  });

  it('丢弃没有 id 的 tab', () => {
    const tabs = [
      { ...makeTab({ url: 'https://a.com/' }), id: undefined } as chrome.tabs.Tab,
      makeTab({ id: 2, url: 'https://a.com/' }),
    ];
    expect(visibleTabs(tabs, MANAGER).map((t) => t.id)).toEqual([2]);
  });

  it('新标签页不出现在可见列表中', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/' }),
      makeTab({ id: 2, url: 'chrome-extension://test-id/src/newtab/index.html' }),
    ];
    expect(visibleTabs(tabs, 'chrome-extension://test-id/').map((t) => t.id)).toEqual([1]);
  });
});

describe('domainGroupKey', () => {
  it('http/https 取 hostname', () => {
    expect(domainGroupKey('https://www.a.com/p')).toBe('www.a.com');
  });
  it('chrome:// 归入 #chrome', () => {
    expect(domainGroupKey('chrome://settings/')).toBe('#chrome');
  });
  it('file:// 归入 #file', () => {
    expect(domainGroupKey('file:///Users/x/a.pdf')).toBe('#file');
  });
  it('其他协议与非法 URL 归入 #other', () => {
    expect(domainGroupKey('chrome-extension://abc/page.html')).toBe('#other');
    expect(domainGroupKey('not a url')).toBe('#other');
  });
});

describe('groupByDomain', () => {
  it('按 tab 数降序，组内保持传入顺序', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://b.com/1' }),
      makeTab({ id: 2, url: 'https://a.com/1' }),
      makeTab({ id: 3, url: 'https://a.com/2' }),
    ];
    const groups = groupByDomain(tabs);
    expect(groups.map((g) => g.key)).toEqual(['a.com', 'b.com']);
    expect(groups[0].tabs.map((t) => t.id)).toEqual([2, 3]);
  });
});

describe('sortWindowsCurrentFirst', () => {
  it('当前窗口置顶，其余保持原顺序', () => {
    const wins = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(sortWindowsCurrentFirst(wins, 2).map((w) => w.id)).toEqual([2, 1, 3]);
  });
  it('currentWindowId 未知时原样返回', () => {
    const wins = [{ id: 1 }, { id: 2 }];
    expect(sortWindowsCurrentFirst(wins, undefined).map((w) => w.id)).toEqual([1, 2]);
  });
});

describe('hostnameOf', () => {
  it('合法 URL 返回其 hostname', () => {
    expect(hostnameOf('https://www.a.com/p')).toBe('www.a.com');
  });
  it('无 URL 返回空串', () => {
    expect(hostnameOf(undefined)).toBe('');
  });
  it('非法 URL 返回空串', () => {
    expect(hostnameOf('not a url')).toBe('');
  });
});
