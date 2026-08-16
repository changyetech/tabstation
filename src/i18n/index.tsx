import { createContext, useCallback, useContext, type ReactNode } from 'react';
import en from './en.json';
import zhCN from './zh_CN.json';
import type { Language } from './resolve';

export type { Language } from './resolve';
export { resolveLanguage } from './resolve';

const dictionaries: Record<Language, Record<string, string>> = {
  en,
  'zh-CN': zhCN,
};

const I18nContext = createContext<Language>('en');

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(I18nContext);
}

// t(key, params)：{name} 形式插值；缺 key 返回 key 本身（便于发现漏译）
// 复数选择：{k|单数|复数} 按参数值是否为 1 取词（仅 en 文案使用；zh 无复数变化）
export function useT() {
  const lang = useContext(I18nContext);
  return useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = dictionaries[lang][key] ?? key;
      if (params) {
        text = text.replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (raw, k, one, other) => {
          const v = params[k];
          return v === undefined ? raw : Number(v) === 1 ? one : other;
        });
        for (const [k, v] of Object.entries(params)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [lang],
  );
}
