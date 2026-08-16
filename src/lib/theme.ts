import type { Settings } from './storage';

export type ResolvedTheme = 'light' | 'dark';

// 三态偏好 → 实际主题：auto 跟随系统（spec §2 主题）
export function resolveTheme(pref: Settings['theme'], systemDark: boolean): ResolvedTheme {
  if (pref === 'auto') return systemDark ? 'dark' : 'light';
  return pref;
}
