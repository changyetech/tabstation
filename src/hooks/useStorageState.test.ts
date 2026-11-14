import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { useStorageState } from './useStorageState';

describe('useStorageState', () => {
  it('持久化完成前收到更新事件，旧写入返回值不会覆盖它', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = ['saved'];
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual(['saved']));
    const originalSet = chromeMock.storage.local.set.getMockImplementation()!;
    let complete!: () => void;
    chromeMock.storage.local.set.mockImplementationOnce(async (items) => {
      await originalSet(items);
      await new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    let pending!: Promise<void>;
    act(() => {
      pending = result.current[1](['first']);
    });
    await waitFor(() => expect(result.current[0]).toEqual(['first']));
    await act(() => chromeMock.storage.local.set({ readLater: ['newer'] }));

    await act(async () => {
      complete();
      await pending;
    });

    expect(result.current[0]).toEqual(['newer']);
  });

  it('初始读取未完成时写入失败，初始已保存值仍能加载', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = ['saved'];
    let complete!: (value: Record<string, unknown>) => void;
    chromeMock.storage.local.get.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

    await act(async () => {
      await expect(result.current[1]((list) => [...list, 'failed'])).rejects.toThrow();
      complete({ readLater: ['saved'] });
    });

    expect(result.current[0]).toEqual(['saved']);
  });

  it('两个页面同时函数式更新不会互相覆盖，并都同步到最终值', async () => {
    const { storageData } = getChromeMock();
    storageData.readLater = ['saved'];
    const first = renderHook(() => useStorageState<string[]>('readLater', []));
    const second = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(second.result.current[0]).toEqual(['saved']));

    await act(() =>
      Promise.all([
        first.result.current[1]((list) => [...list, 'one']),
        second.result.current[1]((list) => [...list, 'two']),
      ]),
    );

    expect(storageData.readLater).toEqual(['saved', 'one', 'two']);
    expect(first.result.current[0]).toEqual(['saved', 'one', 'two']);
    expect(second.result.current[0]).toEqual(['saved', 'one', 'two']);
  });

  it('持久化失败时保留已保存状态，并向调用方报告失败', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = ['saved'];
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));
    await waitFor(() => expect(result.current[0]).toEqual(['saved']));
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

    await act(async () => {
      await expect(result.current[1](['new'])).rejects.toThrow('Storage failed');
    });

    expect(result.current[0]).toEqual(['saved']);
    expect(storageData.readLater).toEqual(['saved']);
  });

  it('初始读取晚于跨页更新完成时，不覆盖新值或函数式写入基准', async () => {
    const { chromeMock } = getChromeMock();
    let resolveRead!: (value: Record<string, unknown>) => void;
    chromeMock.storage.local.get.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
    );
    const { result } = renderHook(() => useStorageState<string[]>('readLater', []));

    await act(() => chromeMock.storage.local.set({ readLater: ['remote'] }));
    await act(async () => resolveRead({ readLater: ['old'] }));
    expect(result.current[0]).toEqual(['remote']);
    await act(() => result.current[1]((list) => [...list, 'local']));
    expect(result.current[0]).toEqual(['remote', 'local']);
  });

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
    await act(() => chromeMock.storage.local.set({ readLater: ['remote'] }));
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
