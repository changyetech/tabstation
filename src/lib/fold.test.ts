import { describe, expect, it } from 'vitest';
import { foldTabs } from './fold';

const list = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('foldTabs', () => {
  it('不超限时全量展示，无 more 行', () => {
    expect(foldTabs(list(8), 8, false)).toEqual({
      shown: list(8),
      hiddenCount: 0,
      expanded: false,
    });
  });
  it('超限且未展开：截断到 limit，报告隐藏数', () => {
    const r = foldTabs(list(12), 8, false);
    expect(r.shown).toHaveLength(8);
    expect(r.hiddenCount).toBe(4);
    expect(r.expanded).toBe(false);
  });
  it('超限且展开：全量展示但保留收起入口', () => {
    const r = foldTabs(list(12), 8, true);
    expect(r.shown).toHaveLength(12);
    expect(r.hiddenCount).toBe(4);
    expect(r.expanded).toBe(true);
  });
  it('all 永不折叠', () => {
    expect(foldTabs(list(99), 'all', false).hiddenCount).toBe(0);
    expect(foldTabs(list(99), 'all', false).shown).toHaveLength(99);
  });

  // 重复豁免（spec 2026-08-17-dup-fold-exemption）
  it('豁免行不被折叠，且保持原顺序', () => {
    const r = foldTabs(list(12), 8, false, (x) => x === 9 || x === 11);
    expect(r.shown).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 9, 11]);
    expect(r.hiddenCount).toBe(2);
    expect(r.expanded).toBe(false);
  });
  it('超限行全为豁免行时无 more 行', () => {
    const r = foldTabs(list(12), 8, false, (x) => x >= 8);
    expect(r.shown).toHaveLength(12);
    expect(r.hiddenCount).toBe(0);
    expect(r.expanded).toBe(false);
  });
  it('豁免行不影响展开态的全量展示', () => {
    const r = foldTabs(list(12), 8, true, (x) => x === 9);
    expect(r.shown).toHaveLength(12);
    expect(r.hiddenCount).toBe(3);
    expect(r.expanded).toBe(true);
  });
});
