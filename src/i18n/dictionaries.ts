import en from './en.json';
import zhCN from './zh_CN.json';
import ru from './ru.json';
import ko from './ko.json';
import ja from './ja.json';
import fr from './fr.json';
import type { Language } from './resolve';

// 页面与 service worker 共用；编译期检查各语言的键是否齐全。
export const dictionaries: Record<Language, Record<keyof typeof en, string>> = {
  en,
  'zh-CN': zhCN,
  ru,
  ko,
  ja,
  fr,
};
