import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import { findDuplicateGroups, planDedupe } from './dedupe';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

describe('findDuplicateGroups', () => {
  it('归一化后相同 URL ≥2 个成组（hash 不同也算重复）', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/p#x' }),
      makeTab({ id: 2, url: 'https://a.com/p#y' }),
      makeTab({ id: 3, url: 'https://b.com/' }),
    ];
    const groups = findDuplicateGroups(tabs, MANAGER);
    expect(groups).toHaveLength(1);
    expect(groups[0].url).toBe('https://a.com/p');
    expect(groups[0].tabs.map((t) => t.id)).toEqual([1, 2]);
  });

  it('统计跨窗口（范围恒为全浏览器）', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/', windowId: 1 }),
      makeTab({ id: 2, url: 'https://a.com/', windowId: 2 }),
    ];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(1);
  });

  it('管理页不计入', () => {
    const tabs = [makeTab({ id: 1, url: MANAGER }), makeTab({ id: 2, url: MANAGER })];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(0);
  });

  it('全部成员均为 pinned 的组不算重复', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://a.com/', pinned: true }),
      makeTab({ id: 2, url: 'https://a.com/', pinned: true }),
    ];
    expect(findDuplicateGroups(tabs, MANAGER)).toHaveLength(0);
  });

  it('没有 id 的 tab 被跳过，不进入任何组', () => {
    const tabs = [
      { ...makeTab({ url: 'https://a.com/' }), id: undefined } as chrome.tabs.Tab,
      makeTab({ id: 2, url: 'https://a.com/' }),
      makeTab({ id: 3, url: 'https://a.com/' }),
    ];
    const groups = findDuplicateGroups(tabs, MANAGER);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabs.map((t) => t.id)).toEqual([2, 3]);
  });

  it('两个新标签页不得被判为重复组（自有页面前缀过滤）', () => {
    const EXT_BASE = 'chrome-extension://test-id/';
    const tabs = [
      makeTab({ id: 1, url: EXT_BASE + 'src/newtab/index.html' }),
      makeTab({ id: 2, url: EXT_BASE + 'src/newtab/index.html' }),
    ];
    expect(findDuplicateGroups(tabs, EXT_BASE)).toHaveLength(0);
  });
});

describe('planDedupe', () => {
  it('纯普通组：保留 lastAccessed 最新，undefined 视为最旧', () => {
    const groups = findDuplicateGroups(
      [
        makeTab({ id: 1, url: 'https://a.com/', lastAccessed: 100 }),
        makeTab({ id: 2, url: 'https://a.com/', lastAccessed: 200 }),
        makeTab({ id: 3, url: 'https://a.com/', lastAccessed: undefined }),
      ],
      MANAGER,
    );
    const plan = planDedupe(groups);
    expect(plan.keepIds).toEqual([2]);
    expect(plan.closeIds.sort()).toEqual([1, 3]);
  });

  it('混合组：保留所有 pinned，关闭所有普通（无论 lastAccessed）', () => {
    const groups = findDuplicateGroups(
      [
        makeTab({ id: 1, url: 'https://a.com/', pinned: true, lastAccessed: 100 }),
        makeTab({ id: 2, url: 'https://a.com/', pinned: true, lastAccessed: 50 }),
        makeTab({ id: 3, url: 'https://a.com/', lastAccessed: 999 }),
      ],
      MANAGER,
    );
    const plan = planDedupe(groups);
    expect(plan.keepIds.sort()).toEqual([1, 2]);
    expect(plan.closeIds).toEqual([3]);
  });
});
