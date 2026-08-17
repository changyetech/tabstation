import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { useStorageState } from './useStorageState';

describe('useStorageState', () => {
  it('挂载时读取已存值，无值用 fallback', async () => {
    const { storageData } = getChromeMock();
    storageData.readLater = [{ id: 'x' }];
    const { result } = renderHook(() => useStorageState<unknown[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([{ id: 'x' }]));
  });

  it('write 更新 state 并写入 storage', async () => {
    const { storageData } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('sessions', []));
    await act(() => result.current[1](['a']));
    expect(result.current[0]).toEqual(['a']);
    expect(storageData.sessions).toEqual(['a']);
  });

  it('函数式写入以最新已提交值为基准：陈旧闭包不会把已有变更覆盖回去', async () => {
    const { storageData } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([]));
    // 抓住某次渲染时的 writer 引用，模拟「延迟提交」场景下的陈旧闭包
    const staleWrite = result.current[1];
    await act(() => staleWrite((list) => [...list, 'a']));
    await act(() => staleWrite((list) => [...list, 'b']));
    expect(result.current[0]).toEqual(['a', 'b']);
    expect(storageData.readLater).toEqual(['a', 'b']);
  });

  it('函数式写入的基准也包含其他页面（onChanged）同步过来的值', async () => {
    const { chromeMock } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([]));
    act(() => {
      chromeMock.storage.onChanged.emit({ readLater: { newValue: ['remote'] } }, 'local');
    });
    await act(() => result.current[1]((list) => [...list, 'local']));
    expect(result.current[0]).toEqual(['remote', 'local']);
  });

  it('其他页面写入（onChanged）→ 本页自动同步', async () => {
    const { chromeMock } = getChromeMock();
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([]));
    act(() => {
      chromeMock.storage.onChanged.emit({ readLater: { newValue: ['remote'] } }, 'local');
    });
    expect(result.current[0]).toEqual(['remote']);
  });

  it('卸载时移除 onChanged 监听器', async () => {
    const { chromeMock } = getChromeMock();
    // 通过 spy 捕获 hook 内部注册的监听器引用，直接断言其在 mock 事件里的登记状态
    const addSpy = vi.spyOn(chromeMock.storage.onChanged, 'addListener');
    const { result, unmount } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual([]));
    const listener = addSpy.mock.calls[0][0];
    expect(chromeMock.storage.onChanged.hasListener(listener)).toBe(true);
    unmount();
    expect(chromeMock.storage.onChanged.hasListener(listener)).toBe(false);
  });
});
