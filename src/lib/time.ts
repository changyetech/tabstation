// 最后浏览时间展示（spec §5.9）：缺失→—；60 秒内→刚刚；其余取最大整数单位
export type LastAccessedDisplay =
  | { kind: 'missing' }
  | { kind: 'justNow' }
  | { kind: 'relative'; value: number; unit: 'minute' | 'hour' | 'day' | 'month' | 'year' };

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
