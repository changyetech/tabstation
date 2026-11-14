import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import App from './App';

afterEach(() => vi.useRealTimers());

function seed() {
  const handle = getChromeMock();
  handle.chromeMock.tabs.query.mockResolvedValue([
    makeTab({ id: 1, title: 'Source', url: 'https://a.com/' }),
  ]);
  handle.chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
  return handle;
}

const readItem = { id: 'r1', url: 'https://a.com/', title: 'Saved', savedAt: 1 };

describe('保存与关闭的异步顺序', () => {
  it.each([
    ['all', '收进稍后阅读（保存并关闭）'],
    ['all', '全部收进稍后阅读（保存并关闭，固定与非网页标签除外）'],
    ['window', '保存窗口'],
  ] as const)('%s：%s 必须等持久化成功才关闭源对象', async (mode, title) => {
    const { chromeMock, storageData } = seed();
    storageData.settings = { defaultView: mode, closeWindowAfterSave: true };
    render(<App />);
    await screen.findByText('Source');
    let complete!: () => void;
    chromeMock.storage.local.set.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: title }));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
    expect(chromeMock.windows.remove).not.toHaveBeenCalled();

    await act(async () => complete());
    await act(() => vi.advanceTimersByTimeAsync(1000));
    if (mode === 'window') expect(chromeMock.windows.remove).toHaveBeenCalledWith(1);
    else expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]);
  });

  it.each([
    '收进稍后阅读（保存并关闭）',
    '全部收进稍后阅读（保存并关闭，固定与非网页标签除外）',
    '保存窗口',
  ])('%s：写入失败保留源对象并反馈失败', async (title) => {
    const { chromeMock, storageData } = seed();
    storageData.settings = {
      defaultView: title === '保存窗口' ? 'window' : 'all',
      closeWindowAfterSave: true,
    };
    render(<App />);
    await screen.findByText('Source');
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

    await userEvent.click(screen.getByRole('button', { name: title }));

    expect(await screen.findByText('操作失败，请重试')).toBeInTheDocument();
    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
    expect(chromeMock.windows.remove).not.toHaveBeenCalled();
  });
});

describe('稍后阅读打开成功后才移除', () => {
  it('全部打开等待期间重复点击不会创建重复窗口', async () => {
    const { chromeMock, storageData } = seed();
    storageData.readLater = [readItem];
    render(<App />);
    await screen.findByText('Saved');
    let complete!: (win: Awaited<ReturnType<typeof chromeMock.windows.create>>) => void;
    chromeMock.windows.create.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: '在新窗口打开全部，并清空清单' }));
    await userEvent.click(screen.getByRole('button', { name: '在新窗口打开全部，并清空清单' }));

    expect(chromeMock.windows.create).toHaveBeenCalledTimes(1);
    await act(async () => complete({ id: 2, tabs: [] }));
    await waitFor(() => expect(storageData.readLater).toEqual([]));
  });

  it('删除写入失败恢复退场行，保留清单并提示失败', async () => {
    const { chromeMock, storageData } = seed();
    storageData.readLater = [readItem];
    render(<App />);
    const row = (await screen.findByText('Saved')).closest('li');
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

    await userEvent.click(screen.getByRole('button', { name: '从清单删除' }));

    expect(await screen.findByText('操作失败，请重试')).toBeInTheDocument();
    expect(row).not.toHaveClass('closing');
    expect(storageData.readLater).toEqual([readItem]);
  });

  it.each(['打开并从清单移除', '新窗口打开（并从清单移除）', '全部打开'])(
    '%s：创建失败时保留清单',
    async (title) => {
      const { chromeMock, storageData } = seed();
      storageData.readLater = [readItem];
      render(<App />);
      await screen.findByText('Saved');
      if (title === '打开并从清单移除')
        chromeMock.tabs.create.mockRejectedValueOnce(new Error('No tab'));
      else chromeMock.windows.create.mockRejectedValueOnce(new Error('No window'));

      await userEvent.click(
        title === '全部打开'
          ? screen.getByRole('button', { name: '在新窗口打开全部，并清空清单' })
          : screen.getByRole('button', {
              name: title === '打开并从清单移除' ? readItem.title : title,
            }),
      );

      expect(await screen.findByText('操作失败，请重试')).toBeInTheDocument();
      expect(storageData.readLater).toEqual([readItem]);
      expect(screen.getByText('Saved')).toBeInTheDocument();

      // 失败后解除防重入标记，用户可以立即重试。
      await userEvent.click(
        title === '全部打开'
          ? screen.getByRole('button', { name: '在新窗口打开全部，并清空清单' })
          : screen.getByRole('button', {
              name: title === '打开并从清单移除' ? readItem.title : title,
            }),
      );
      await waitFor(() => expect(storageData.readLater).toEqual([]));
    },
  );

  it('全部打开期间新增的条目不会被清空', async () => {
    const { chromeMock, storageData } = seed();
    storageData.readLater = [readItem];
    render(<App />);
    await screen.findByText('Saved');
    let complete!: (win: Awaited<ReturnType<typeof chromeMock.windows.create>>) => void;
    chromeMock.windows.create.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: '在新窗口打开全部，并清空清单' }));
    await waitFor(() => expect(chromeMock.windows.create).toHaveBeenCalled());
    const added = { ...readItem, id: 'r2', url: 'https://b.com/', title: 'Added' };
    await act(() => chromeMock.storage.local.set({ readLater: [readItem, added] }));

    await act(async () => complete({ id: 2, tabs: [] }));

    await waitFor(() => expect(storageData.readLater).toEqual([added]));
    expect(screen.getByText('Added')).toBeInTheDocument();
  });
});

describe('会话条目并发修改', () => {
  it('连续移除旧快照下标时拒绝过期操作，不误删其他条目', async () => {
    const { chromeMock, storageData } = seed();
    storageData.sessions = [
      {
        id: 's',
        name: 'Session',
        createdAt: 1,
        tabs: ['A', 'B', 'C'].map((title) => ({
          title,
          url: `https://${title.toLowerCase()}.com/`,
        })),
      },
    ];
    render(<App />);
    await userEvent.click(screen.getByText('已保存窗口'));
    await screen.findByText('A');
    const originalSet = chromeMock.storage.local.set.getMockImplementation()!;
    let complete!: () => Promise<void>;
    chromeMock.storage.local.set.mockImplementationOnce(
      (items) =>
        new Promise<void>((resolve) => {
          complete = async () => {
            await originalSet(items);
            resolve();
          };
        }),
    );
    const buttons = screen.getAllByRole('button', { name: '移除此条' });
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);

    await act(() => complete());

    expect(await screen.findByText('操作失败，请重试')).toBeInTheDocument();
    expect(
      (storageData.sessions as { tabs: { title: string }[] }[])[0].tabs.map((tab) => tab.title),
    ).toEqual(['B', 'C']);
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
