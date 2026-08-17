import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import { useTabs } from './useTabs';

describe('useTabs', () => {
  it('挂载时全量拉取 tabs/windows/currentWindowId', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 1 })]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    const { result } = renderHook(() => useTabs());
    await waitFor(() => {
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.windows).toHaveLength(1);
      expect(result.current.currentWindowId).toBe(1);
    });
  });

  it('tabs 事件触发重查', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toEqual([]));

    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 2 })]);
    await act(async () => {
      chromeMock.tabs.onCreated.emit(makeTab({ id: 2 }) as never);
    });
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
  });

  it('冷却窗口内连发的事件：首个立即重查，其余合并为一次尾随重查', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    renderHook(() => useTabs());
    await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalledTimes(1));

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        chromeMock.tabs.onUpdated.emit(1 as never, {} as never, {} as never);
      }
    });
    expect(chromeMock.tabs.query).toHaveBeenCalledTimes(2); // 首个事件立即

    await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalledTimes(3)); // 余下 4 个合并成 1 次
    await new Promise((resolve) => setTimeout(resolve, 120)); // 冷却窗口过后不应再有补刷
    expect(chromeMock.tabs.query).toHaveBeenCalledTimes(3);
  });

  it('onReplaced（预渲染换页）也触发重查', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    renderHook(() => useTabs());
    await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalledTimes(1));
    await act(async () => {
      chromeMock.tabs.onReplaced.emit(2 as never, 1 as never);
    });
    expect(chromeMock.tabs.query).toHaveBeenCalledTimes(2);
  });

  it('卸载后移除全部监听', async () => {
    const { chromeMock } = getChromeMock();
    const { unmount } = renderHook(() => useTabs());
    await waitFor(() => expect(chromeMock.tabs.query).toHaveBeenCalled());
    unmount();
    const before = chromeMock.tabs.query.mock.calls.length;
    await act(async () => {
      chromeMock.tabs.onRemoved.emit(1 as never, {} as never);
    });
    expect(chromeMock.tabs.query.mock.calls.length).toBe(before);
  });

  it('windowId 不在 windows.getAll() 结果里的 tab（如 devtools/app 窗口）会被过滤掉', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1 }),
      makeTab({ id: 2, windowId: 99 }), // 孤儿 tab：不在 windows.getAll() 里
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.windows).toHaveLength(1));
    expect(result.current.tabs.map((t) => t.id)).toEqual([1]);
  });

  it('先发起但后 resolve 的过期 refresh 不会覆盖后发起且先 resolve 的新结果', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    let resolveMountQuery!: (tabs: chrome.tabs.Tab[]) => void;
    const mountQueryPromise = new Promise<chrome.tabs.Tab[]>((resolve) => {
      resolveMountQuery = resolve;
    });
    // 挂载时触发的第一次 refresh：tabs.query 先不 resolve，挂起
    chromeMock.tabs.query.mockReturnValueOnce(mountQueryPromise);
    // 事件触发的第二次 refresh：立即 resolve，带着更新的数据
    chromeMock.tabs.query.mockResolvedValue([makeTab({ id: 99 })]);

    const { result } = renderHook(() => useTabs());

    // 第二次 refresh 由事件触发，先 resolve 落地
    await act(async () => {
      chromeMock.tabs.onCreated.emit(makeTab({ id: 99 }) as never);
    });
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    expect(result.current.tabs[0].id).toBe(99);

    // 现在让第一次（挂载时）的 refresh 用过期数据 resolve——不应覆盖新结果
    await act(async () => {
      resolveMountQuery([makeTab({ id: 1 })]);
    });
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].id).toBe(99);
  });
});
