import { describe, expect, it } from 'vitest';
import { makeTab } from '../test/factories';
import {
  buildSuggestion,
  escapeXml,
  matchOmnibox,
  parseContent,
  toContent,
  defaultDescription,
  type OmniItem,
  type OmniSource,
} from './omnibox';

const emptySource: OmniSource = { tabs: [], readLater: [], sessions: [] };

describe('matchOmnibox', () => {
  it('空输入与纯空白输入返回空数组', () => {
    const source = { ...emptySource, tabs: [makeTab({ title: 'MV3 指南' })] };
    expect(matchOmnibox('', source)).toEqual([]);
    expect(matchOmnibox('   ', source)).toEqual([]);
  });

  it('标题与 URL 均可命中，且大小写不敏感', () => {
    const source: OmniSource = {
      ...emptySource,
      tabs: [
        makeTab({ id: 1, title: 'MV3 迁移指南', url: 'https://developer.chrome.com/a' }),
        makeTab({ id: 2, title: '无关', url: 'https://example.com/mv3-notes' }),
      ],
    };
    expect(matchOmnibox('mv3', source).map((x) => x.kind === 'tab' && x.tabId)).toEqual([1, 2]);
  });

  it('类间顺序恒为 tab → read → session', () => {
    const source: OmniSource = {
      tabs: [makeTab({ id: 1, title: 'x 标签' })],
      readLater: [{ id: 'r1', url: 'https://a.com/', title: 'x 待读', savedAt: 1 }],
      sessions: [{ id: 's1', name: 'x 会话', createdAt: 1, tabs: [] }],
    };
    expect(matchOmnibox('x', source).map((i) => i.kind)).toEqual(['tab', 'read', 'session']);
  });

  it('类内限额 3、总数上限 6', () => {
    const many = (n: number, p: string) =>
      Array.from({ length: n }, (_, i) => makeTab({ id: i + 1, title: `${p}${i}` }));
    const source: OmniSource = {
      tabs: many(5, 'x'),
      readLater: Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        url: 'https://a.com/',
        title: `x${i}`,
        savedAt: i,
      })),
      sessions: Array.from({ length: 5 }, (_, i) => ({
        id: `s${i}`,
        name: `x${i}`,
        createdAt: i,
        tabs: [],
      })),
    };
    const out = matchOmnibox('x', source);
    expect(out).toHaveLength(6);
    expect(out.filter((i) => i.kind === 'tab')).toHaveLength(3);
  });

  it('类内排序：tab 按 lastAccessed 降序', () => {
    const source: OmniSource = {
      ...emptySource,
      tabs: [
        makeTab({ id: 1, title: 'x 旧', lastAccessed: 100 }),
        makeTab({ id: 2, title: 'x 新', lastAccessed: 900 }),
      ],
    };
    expect(matchOmnibox('x', source).map((i) => i.kind === 'tab' && i.tabId)).toEqual([2, 1]);
  });
});

describe('escapeXml 与 buildSuggestion', () => {
  it('转义 & < >', () => {
    expect(escapeXml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('含 & 的标题构造出的 description 仍是合法 XML，且 match 标记未被自身转义', () => {
    const item: OmniItem = {
      kind: 'tab',
      tabId: 1,
      windowId: 1,
      title: 'Rust & Wasm 指南',
      url: 'https://example.com/a',
    };
    const { description } = buildSuggestion(item, 'wasm');
    expect(description).toContain('&amp;');
    expect(description).toContain('<match>');
    expect(() =>
      new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml'),
    ).not.toThrow();
    expect(
      new DOMParser()
        .parseFromString(`<x>${description}</x>`, 'text/xml')
        .querySelector('parsererror'),
    ).toBeNull();
  });

  it('回归：高亮位置若在转义实体内会分裂实体——应在原始文本中查找匹配后逐段转义', () => {
    // 标题包含 "&"，查询 "am" 在转义后会落在 "&amp;" 内，但在原文是 "cream" 的 "am"
    const item: OmniItem = {
      kind: 'tab',
      tabId: 1,
      windowId: 1,
      title: 'Ben & cream',
      url: 'https://example.com/',
    };
    const { description } = buildSuggestion(item, 'am');
    // 验证输出是合法 XML
    expect(() =>
      new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml'),
    ).not.toThrow();
    const doc = new DOMParser().parseFromString(`<x>${description}</x>`, 'text/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    // 验证高亮标记没有分裂 &amp; 实体
    expect(description).toMatch(/&amp;/);
    expect(description).not.toMatch(/&<match>/);
    expect(description).not.toMatch(/<\/match>;/);
  });
});

describe('toContent / parseContent', () => {
  it('三类标识可往返', () => {
    const item: OmniItem = { kind: 'read', id: 'r1', title: 't', url: 'https://a.com/' };
    expect(parseContent(toContent(item))).toEqual({ kind: 'read', id: 'r1' });
  });

  it('原始用户输入与畸形输入返回 null 而不抛异常', () => {
    expect(parseContent('mv3')).toBeNull();
    expect(parseContent('')).toBeNull();
    expect(parseContent('bogus:1')).toBeNull();
  });
});

describe('defaultDescription', () => {
  it('空输入显示默认文案', () => {
    expect(defaultDescription('', 0)).toBe('搜索标签页、稍后阅读与会话');
  });

  it('有输入且有结果', () => {
    expect(defaultDescription('mv3', 3)).toBe('搜索「mv3」 · 找到 3 项');
  });

  it('有输入但无结果', () => {
    expect(defaultDescription('xxx', 0)).toBe('没有匹配项 · 回车打开 Tab Station');
  });
});
