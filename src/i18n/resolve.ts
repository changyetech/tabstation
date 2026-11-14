export type Language = 'en' | 'zh-CN' | 'ru' | 'ko' | 'ja' | 'fr';

// 自动模式匹配浏览器语言主标签；未支持的语言默认英语。
export function resolveLanguage(setting: 'auto' | Language, navigatorLanguage: string): Language {
  if (setting !== 'auto') return setting;
  const base = navigatorLanguage.toLowerCase().split('-')[0];
  if (base === 'zh') return 'zh-CN';
  if (base === 'ru' || base === 'ko' || base === 'ja' || base === 'fr') return base;
  return 'en';
}

const pluralRules = new Map<Language, Intl.PluralRules>();

// t(key, params)：{name} 形式插值；缺 key 返回 key 本身（便于发现漏译）
// 复数选择：{k|one|other} 或 {k|one|few|many|other}（俄语）。
// 纯函数，不依赖 React——供页面层 useT 与 service worker（background.ts）共用
export function translate(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
  language: Language = 'en',
): string {
  let text = dict[key] ?? key;
  if (params) {
    text = text.replace(/\{(\w+)\|([^}]+)\}/g, (raw, k: string, forms: string) => {
      const v = params[k];
      if (v === undefined) return raw;
      let rules = pluralRules.get(language);
      if (!rules) {
        rules = new Intl.PluralRules(language);
        pluralRules.set(language, rules);
      }
      const choices = forms.split('|');
      const category = rules.select(Number(v));
      if (choices.length === 4) {
        const index = { one: 0, few: 1, many: 2, other: 3, zero: 3, two: 3 }[category];
        return choices[index];
      }
      return category === 'one' ? choices[0] : choices[1];
    });
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
