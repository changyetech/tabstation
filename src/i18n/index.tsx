import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { dictionaries } from './dictionaries';
import { translate, type Language } from './resolve';

export type { Language } from './resolve';
export { resolveLanguage } from './resolve';

const I18nContext = createContext<Language>('en');

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  return <I18nContext.Provider value={language}>{children}</I18nContext.Provider>;
}

export function useLanguage(): Language {
  return useContext(I18nContext);
}

export function useT() {
  const lang = useContext(I18nContext);
  return useCallback(
    (key: string, params?: Record<string, string | number>): string =>
      translate(dictionaries[lang], key, params, lang),
    [lang],
  );
}
