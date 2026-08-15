import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import App from './App';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

function seedTwoWindows() {
  const { chromeMock } = getChromeMock();
  chromeMock.tabs.query.mockResolvedValue([
    makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
    makeTab({ id: 2, windowId: 1, index: 1, title: 'Manager', url: MANAGER }),
    makeTab({ id: 3, windowId: 2, index: 0, title: 'B1', url: 'https://b.com/', active: true }),
  ]);
  chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 }), makeWindow({ id: 2 })]);
  chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 2 }));
}

describe('App', () => {
  it('窗口模式：当前窗口置顶、管理页隐身且不计数', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2));
    const headings = screen.getAllByRole('heading', { level: 2 });
    // 当前窗口（id=2，序号 2）置顶
    expect(headings[0]).toHaveTextContent('窗口 2（当前窗口）');
    // 窗口 1 有 2 个真实 tab，但管理页隐身 → 只计 1 个
    expect(headings[1]).toHaveTextContent('(1 个 tab)');
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('全部模式：合并为一份列表（按窗口顺序 + index）', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部模式'));
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    const titles = screen.getAllByText(/^(A1|B1)$/).map((el) => el.textContent);
    expect(titles).toEqual(['A1', 'B1']);
  });

  it('移动到·其他窗口：调用 chrome.tabs.move，且菜单不含 tab 自己所在窗口', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    render(<App />);
    const a1 = await screen.findByText('A1');
    const row = a1.closest('li');
    if (!row) throw new Error('A1 所在行未找到');
    await userEvent.click(within(row).getByTitle('移动到'));
    // A1 在窗口 1，目标菜单应只含窗口 2（不含自己所在的窗口 1）
    expect(within(row).queryByText(/^窗口 1 ·/)).not.toBeInTheDocument();
    const target = within(row).getByText('窗口 2 · B1 (1 个 tab)');
    await userEvent.click(target);
    expect(chromeMock.tabs.move).toHaveBeenCalledWith(1, { windowId: 2, index: -1 });
  });

  it('移动到·新窗口（全屏）：create 后 update 为 maximized', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    render(<App />);
    const b1 = await screen.findByText('B1');
    const row = b1.closest('li');
    if (!row) throw new Error('B1 所在行未找到');
    await userEvent.click(within(row).getByTitle('移动到'));
    await userEvent.click(within(row).getByText('新窗口（全屏）'));
    expect(chromeMock.windows.create).toHaveBeenCalledWith(expect.objectContaining({ tabId: 3 }));
    expect(chromeMock.windows.update).toHaveBeenCalledWith(9002, { state: 'maximized' });
  });

  it('移动到·新窗口（同尺寸）：left/top 各 +40，width/height 与源窗口一致', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    chromeMock.windows.get.mockResolvedValue(
      makeWindow({ id: 1, left: 100, top: 50, width: 800, height: 600 }),
    );
    render(<App />);
    const a1 = await screen.findByText('A1');
    const row = a1.closest('li');
    if (!row) throw new Error('A1 所在行未找到');
    await userEvent.click(within(row).getByTitle('移动到'));
    await userEvent.click(within(row).getByText('新窗口（同尺寸）'));
    expect(chromeMock.windows.create).toHaveBeenCalledWith(
      expect.objectContaining({ tabId: 1, left: 140, top: 90, width: 800, height: 600 }),
    );
  });

  it('关闭窗口·窗口含管理页：只关非管理页 tab，窗口存活', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2));
    // 窗口 1：A1 + 管理页（隐身）；管理页在场 → 只关 A1，窗口本身要留活
    const heading = screen.getByRole('heading', { level: 2, name: /窗口 1/ });
    const section = heading.closest('section');
    if (!section) throw new Error('窗口 1 分区未找到');
    await userEvent.click(within(section).getByText(/关闭窗口/));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
    expect(chromeMock.windows.remove).not.toHaveBeenCalled();
  });

  it('关闭窗口·窗口不含管理页：关整个窗口', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2));
    // 窗口 2：只有 B1，没有管理页 → 关整个窗口
    const heading = screen.getByRole('heading', { level: 2, name: /窗口 2/ });
    const section = heading.closest('section');
    if (!section) throw new Error('窗口 2 分区未找到');
    await userEvent.click(within(section).getByText(/关闭窗口/));
    await waitFor(() => expect(chromeMock.windows.remove).toHaveBeenCalledWith(2));
    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });
});

describe('一键去重', () => {
  function seedDuplicates() {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({
        id: 1,
        windowId: 1,
        index: 0,
        title: 'D1',
        url: 'https://d.com/',
        lastAccessed: 100,
      }),
      makeTab({
        id: 2,
        windowId: 1,
        index: 1,
        title: 'D2',
        url: 'https://d.com/',
        lastAccessed: 200,
      }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    return chromeMock;
  }

  it('常驻 ×2 徽标；hover 去重按钮 → 待删行出现删除线样式', async () => {
    seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('×2')).toHaveLength(2));

    await userEvent.hover(screen.getByText(/一键去重/));
    // lastAccessed 较旧的 D1 将被关闭
    expect(screen.getByText('D1').closest('li')).toHaveClass('dup-doomed');
    expect(screen.getByText('D2').closest('li')).toHaveClass('dup-keep');

    await userEvent.unhover(screen.getByText(/一键去重/));
    expect(screen.getByText('D1').closest('li')).not.toHaveClass('dup-doomed');
  });

  it('点击一键去重 → 关闭待删 tab（保留最近浏览）', async () => {
    const chromeMock = seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getByText('D1')).toBeInTheDocument());
    await userEvent.click(screen.getByText(/一键去重/));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
  });
});

describe('测试 harness 冒烟', () => {
  it('chrome mock：storage 读写往返且触发 onChanged', async () => {
    const { chromeMock } = getChromeMock();
    let fired: string[] = [];
    chromeMock.storage.onChanged.addListener((changes: Record<string, unknown>) => {
      fired = Object.keys(changes);
    });
    await chromeMock.storage.local.set({ settings: { language: 'auto' } });
    const res = await chromeMock.storage.local.get('settings');
    expect(res.settings).toEqual({ language: 'auto' });
    expect(fired).toEqual(['settings']);
  });
});
