export type Language = 'en' | 'zh-CN';

// 语言解析（spec §7）：auto 跟随 navigator.language；zh-* 统一落到 zh-CN（V1 仅 en/zh-CN 两种）
export function resolveLanguage(setting: 'auto' | Language, navigatorLanguage: string): Language {
  if (setting !== 'auto') return setting;
  return navigatorLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}
