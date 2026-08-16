import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

// jsdom 无 matchMedia，按需注入可控 mock
function installMatchMedia(dark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const media = {
    matches: dark,
    addEventListener: (_: string, f: (e: { matches: boolean }) => void) => void listeners.add(f),
    removeEventListener: (_: string, f: (e: { matches: boolean }) => void) =>
      void listeners.delete(f),
  };
  vi.stubGlobal('matchMedia', () => media);
  return { emit: (matches: boolean) => listeners.forEach((f) => f({ matches })) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('useTheme', () => {
  it('显式偏好写入 data-theme', () => {
    installMatchMedia(true);
    renderHook(() => useTheme('light'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('auto 跟随系统，系统切换时实时更新', async () => {
    const media = installMatchMedia(false);
    const { rerender } = renderHook(({ pref }) => useTheme(pref), {
      initialProps: { pref: 'auto' as const },
    });
    expect(document.documentElement.dataset.theme).toBe('light');
    const { act } = await import('@testing-library/react');
    act(() => media.emit(true));
    expect(document.documentElement.dataset.theme).toBe('dark');
    rerender({ pref: 'auto' });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('无 matchMedia 环境（保守回退浅色）不抛错', () => {
    renderHook(() => useTheme('auto'));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
