import { useEffect, useState } from 'react';
import { resolveTheme } from '../lib/theme';
import type { Settings } from '../lib/storage';

// 把主题偏好落到 <html data-theme>；auto 时跟随系统实时切换（spec §2 主题）
// 偏好本身由调用方经 useStorageState('settings') 提供，跨页同步走 storage.onChanged
export function useTheme(pref: Settings['theme']): void {
  // jsdom 无 matchMedia 时按浅色处理（测试环境自行 mock）
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveTheme(pref, systemDark);
  }, [pref, systemDark]);
}
