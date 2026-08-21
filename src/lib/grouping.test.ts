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
  it('按注册域排序，且排序不受 tab 数量影响', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://b.com/1' }),
      makeTab({ id: 2, url: 'https://a.b.com/1' }),
      makeTab({ id: 3, url: 'https://a.com/1' }),
      makeTab({ id: 4, url: 'https://a.com/2' }),
      makeTab({ id: 5, url: 'https://z.example.co.uk/1' }),
      makeTab({ id: 6, url: 'https://example.co.uk/1' }),
    ];
    const groups = groupByDomain(tabs);
    expect(groups.map((g) => g.key)).toEqual([
      'a.com',
      'b.com',
      'a.b.com',
      'example.co.uk',
      'z.example.co.uk',
    ]);
    expect(groups[0].tabs.map((t) => t.id)).toEqual([3, 4]);
  });

  it('同一注册域内裸域优先，子域名按层级排序', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://v2.api.example.com/1' }),
      makeTab({ id: 2, url: 'https://example.com/1' }),
      makeTab({ id: 3, url: 'https://admin.api.example.com/1' }),
      makeTab({ id: 4, url: 'https://api.example.com/1' }),
      makeTab({ id: 5, url: 'https://v10.api.example.com/1' }),
    ];
    const groups = groupByDomain(tabs);
    expect(groups.map((g) => g.key)).toEqual([
      'example.com',
      'api.example.com',
      'admin.api.example.com',
      'v2.api.example.com',
      'v10.api.example.com',
    ]);
  });

  it('特殊组固定排在普通域名之后且顺序稳定', () => {
    const tabs = [
      makeTab({ id: 1, url: 'chrome://settings/' }),
      makeTab({ id: 2, url: 'https://a.com/1' }),
      makeTab({ id: 3, url: 'file:///Users/x/a.pdf' }),
      makeTab({ id: 4, url: 'chrome-extension://abc/page.html' }),
    ];
    const groups = groupByDomain(tabs);
    expect(groups.map((g) => g.key)).toEqual(['a.com', '#chrome', '#file', '#other']);
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
