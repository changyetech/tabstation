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
    expect(resolveLanguage('auto', 'de-DE')).toBe('en');
  });

  it.each([
    ['ru', 'ru'],
    ['ru-RU', 'ru'],
    ['ko-KR', 'ko'],
    ['ja', 'ja'],
    ['ja-JP', 'ja'],
    ['fr-CA', 'fr'],
    ['FR-fr', 'fr'],
  ])('auto：%s 解析为 %s', (browser, expected) => {
    expect(resolveLanguage('auto', browser)).toBe(expected);
  });

  it.each(['de-DE', 'es', '', 'unknown', 'zhinvalid'])('auto：未匹配的 %s 默认英文', (browser) => {
    expect(resolveLanguage('auto', browser)).toBe('en');
  });

  it.each(['ru', 'ko', 'ja', 'fr'] as const)('显式设置 %s 优先于浏览器语言', (language) => {
    expect(resolveLanguage(language, 'zh-CN')).toBe(language);
  });
});
