import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { restoreSession } from './restore-session';

describe('restoreSession', () => {
  it('按顺序在新窗口打开全部 URL，并只对 pinned 条目调用 update', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.create.mockResolvedValue({
      id: 9002,
      tabs: [{ id: 11 }, { id: 12 }],
    } as Awaited<ReturnType<typeof chromeMock.windows.create>>);

    await restoreSession(
      {
        id: 's1',
        name: 'x',
        createdAt: 1,
        tabs: [
          { url: 'https://a.com/', title: 'a' },
          { url: 'https://b.com/', title: 'b', pinned: true },
        ],
      },
      'same',
    );

    expect(chromeMock.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: ['https://a.com/', 'https://b.com/'], focused: true }),
    );
    expect(chromeMock.tabs.update).toHaveBeenCalledTimes(1);
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(12, { pinned: true });
  });
});
