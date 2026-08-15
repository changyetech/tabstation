import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './url';

describe('normalizeUrl', () => {
  it('去掉 hash 及之后部分', () => {
    expect(normalizeUrl('https://a.com/p#sec')).toBe('https://a.com/p');
  });
  it('无 hash 原样返回（含 query）', () => {
    expect(normalizeUrl('https://a.com/p?q=1')).toBe('https://a.com/p?q=1');
  });
  it('hash 在 query 之后也整体去掉', () => {
    expect(normalizeUrl('https://a.com/p?q=1#x')).toBe('https://a.com/p?q=1');
  });
  it('空 hash 也去掉井号', () => {
    expect(normalizeUrl('https://a.com/p#')).toBe('https://a.com/p');
  });
});
