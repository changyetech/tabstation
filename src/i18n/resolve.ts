export type Language = 'en' | 'zh-CN';

// 语言解析（spec §7）：auto 跟随 navigator.language；zh-* 统一落到 zh-CN（V1 仅 en/zh-CN 两种）
export function resolveLanguage(setting: 'auto' | Language, navigatorLanguage: string): Language {
  if (setting !== 'auto') return setting;
  return navigatorLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

// t(key, params)：{name} 形式插值；缺 key 返回 key 本身（便于发现漏译）
// 复数选择：{k|单数|复数} 按参数值是否为 1 取词（仅 en 文案使用；zh 无复数变化）
// 纯函数，不依赖 React——供页面层 useT 与 service worker（background.ts）共用
export function translate(
  dict: Record<string, string>,
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = dict[key] ?? key;
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
}
