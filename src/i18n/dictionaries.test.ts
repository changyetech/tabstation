import { describe, expect, it } from 'vitest';
import { dictionaries } from './dictionaries';
import { translate, type Language } from './resolve';

const manifestMessages = import.meta.glob('../../public/_locales/*/messages.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, { message: string }>>;

function parameters(text: string): string[] {
  return [...new Set([...text.matchAll(/\{(\w+)[|}]/g)].map((match) => match[1]))].sort();
}

describe('翻译完整性', () => {
  it.each(Object.keys(dictionaries) as Language[])(
    '%s 的键、插值与 manifest 文案完整',
    (language) => {
      const dictionary = dictionaries[language];
      const locale = language === 'zh-CN' ? 'zh_CN' : language;
      const messages = manifestMessages[`../../public/_locales/${locale}/messages.json`];

      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(dictionaries.en).sort());
      for (const key of Object.keys(dictionaries.en) as (keyof typeof dictionaries.en)[]) {
        expect(dictionary[key].trim(), key).not.toBe('');
        expect(parameters(dictionary[key]), key).toEqual(parameters(dictionaries.en[key]));
        for (const n of [0, 1, 2, 5, 11, 21, 22, 25, 1.5]) {
          const output = translate(
            dictionary,
            key,
            { n, host: 'example.com', query: 'test', v: '1.0', year: 2026 },
            language,
          );
          expect(output, `${key} (${n})`).not.toMatch(/[{}|]/);
        }
      }
      expect(Object.keys(messages).sort()).toEqual(['cmdOpenManager', 'extDescription', 'extName']);
      expect(messages.extName.message).toBe('Tab Station');
      expect(messages.extDescription.message.trim()).not.toBe('');
      expect(messages.cmdOpenManager.message.trim()).not.toBe('');
    },
  );
});
