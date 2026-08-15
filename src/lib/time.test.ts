import { describe, expect, it } from 'vitest';
import { lastAccessedDisplay } from './time';

const NOW = 1_000_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('lastAccessedDisplay', () => {
  it('undefined → missing（UI 显示 —）', () => {
    expect(lastAccessedDisplay(undefined, NOW)).toEqual({ kind: 'missing' });
  });
  it('60 秒内 → justNow', () => {
    expect(lastAccessedDisplay(NOW - 59_000, NOW)).toEqual({ kind: 'justNow' });
  });
  it('分钟 / 小时 / 天 / 月 / 年', () => {
    expect(lastAccessedDisplay(NOW - 3 * MIN, NOW)).toEqual({
      kind: 'relative',
      value: 3,
      unit: 'minute',
    });
    expect(lastAccessedDisplay(NOW - 2 * HOUR, NOW)).toEqual({
      kind: 'relative',
      value: 2,
      unit: 'hour',
    });
    expect(lastAccessedDisplay(NOW - 5 * DAY, NOW)).toEqual({
      kind: 'relative',
      value: 5,
      unit: 'day',
    });
    expect(lastAccessedDisplay(NOW - 65 * DAY, NOW)).toEqual({
      kind: 'relative',
      value: 2,
      unit: 'month',
    });
    expect(lastAccessedDisplay(NOW - 400 * DAY, NOW)).toEqual({
      kind: 'relative',
      value: 1,
      unit: 'year',
    });
  });
  it('未来时间（时钟偏差）按 justNow 兜底', () => {
    expect(lastAccessedDisplay(NOW + 5_000, NOW)).toEqual({ kind: 'justNow' });
  });
});
