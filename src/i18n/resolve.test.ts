import { describe, expect, it } from 'vitest';
import { resolveLanguage } from './resolve';

describe('resolveLanguage', () => {
  it('显式设置直接生效', () => {
    expect(resolveLanguage('en', 'zh-CN')).toBe('en');
    expect(resolveLanguage('zh-CN', 'en-US')).toBe('zh-CN');
  });
  it('auto：navigator 是 zh-* 时取 zh-CN（V1 仅两种语言，zh 变体统一简体）', () => {
    expect(resolveLanguage('auto', 'zh-CN')).toBe('zh-CN');
    expect(resolveLanguage('auto', 'zh')).toBe('zh-CN');
    expect(resolveLanguage('auto', 'zh-TW')).toBe('zh-CN');
  });
  it('auto：其余取 en', () => {
    expect(resolveLanguage('auto', 'en-US')).toBe('en');
    expect(resolveLanguage('auto', 'ja')).toBe('en');
  });
});
