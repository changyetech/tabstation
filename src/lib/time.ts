// 最后浏览时间展示（spec §5.9）：缺失→—；60 秒内→刚刚；其余取最大整数单位
export type RelativeUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

export type LastAccessedDisplay =
  | { kind: 'missing' }
  | { kind: 'justNow' }
  | { kind: 'relative'; value: number; unit: RelativeUnit };

export function lastAccessedDisplay(
  lastAccessed: number | undefined,
  now: number,
): LastAccessedDisplay {
  if (lastAccessed === undefined) return { kind: 'missing' };
  const sec = Math.max(0, (now - lastAccessed) / 1000);
  if (sec < 60) return { kind: 'justNow' };
  if (sec < 3600) return { kind: 'relative', value: Math.floor(sec / 60), unit: 'minute' };
  if (sec < 86400) return { kind: 'relative', value: Math.floor(sec / 3600), unit: 'hour' };
  if (sec < 86400 * 30) return { kind: 'relative', value: Math.floor(sec / 86400), unit: 'day' };
  if (sec < 86400 * 365)
    return { kind: 'relative', value: Math.floor(sec / (86400 * 30)), unit: 'month' };
  return { kind: 'relative', value: Math.floor(sec / (86400 * 365)), unit: 'year' };
}

// Intl 构造器要解析整套 locale 数据，开销远大于一次 format；
// 标签行成百上千时每行每次渲染 new 一个是渲染热点，按语言缓存复用
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

export function formatRelative(lang: string, value: number, unit: RelativeUnit): string {
  let formatter = relativeFormatters.get(lang);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(lang);
    relativeFormatters.set(lang, formatter);
  }
  return formatter.format(-value, unit);
}
