import { describe, expect, it } from 'vitest';
import { faviconUrl } from './favicon';

describe('faviconUrl', () => {
  it('生成扩展 _favicon 本地缓存 URL，携带 pageUrl 与 size', () => {
    expect(faviconUrl('https://a.com/p?x=1')).toBe(
      'chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fa.com%2Fp%3Fx%3D1&size=32',
    );
  });

  it('size 可指定', () => {
    expect(faviconUrl('https://a.com/', 16)).toBe(
      'chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fa.com%2F&size=16',
    );
  });
});
