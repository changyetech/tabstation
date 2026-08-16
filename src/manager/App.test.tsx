import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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

const winBlockOf = (label: string) => {
  const el = screen.getByText(label).closest('section');
  if (!el) throw new Error(`${label} 区块未找到`);
  return el;
};

describe('App', () => {
  it('窗口模式：当前窗口置顶带「当前」胶囊、管理页隐身且不计数', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 2')).toBeInTheDocument());
    // 当前窗口（id=2）置顶且带胶囊
    const blocks = document.querySelectorAll('.win-block');
    expect(blocks[0]).toHaveTextContent('窗口 2');
    expect(within(blocks[0] as HTMLElement).getByText('当前')).toBeInTheDocument();
    // 窗口 1 有 2 个真实 tab，但管理页隐身 → 只计 1 个
    expect(winBlockOf('窗口 1')).toHaveTextContent('1 个标签页');
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
    // 窗口卡片列表在 win-flow 容器内（无侧栏时大屏多列瀑布）
    expect(document.querySelector('.main .win-flow .win-block')).not.toBeNull();
  });

  it('Hero 统计：窗口 / 标签页 / 域名 / 待读', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 2')).toBeInTheDocument());
    const stats = document.querySelector('.stats');
    expect(stats).toHaveTextContent('2窗口');
    expect(stats).toHaveTextContent('2标签页');
    expect(stats).toHaveTextContent('2域名');
    expect(stats).toHaveTextContent('0待读');
  });

  it('全部模式：固定域名视图，跨窗口按域名聚合为区块', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部模式'));
    const heads = [...document.querySelectorAll('.win-block .win-title')].map(
      (el) => el.textContent,
    );
    expect(heads.some((x) => x?.includes('a.com'))).toBe(true);
    expect(heads.some((x) => x?.includes('b.com'))).toBe(true);
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('B1')).toBeInTheDocument();
  });

  it('移动到其他窗口：菜单不含 tab 自己所在窗口，点击调用 chrome.tabs.move', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    render(<App />);
    const a1 = await screen.findByText('A1');
    const row = a1.closest('li');
    if (!row) throw new Error('A1 所在行未找到');
    await userEvent.click(within(row).getByTitle('移动到其他窗口'));
    // A1 在窗口 1，目标菜单经 portal 挂到 body，应只含窗口 2
    expect(screen.queryByText(/^窗口 1 ·/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('窗口 2 · B1'));
    expect(chromeMock.tabs.move).toHaveBeenCalledWith(1, { windowId: 2, index: -1 });
  });

  it('拆到新窗口（默认随当前窗口）：create({tabId}) 复制源窗口尺寸并偏移，不最大化', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    chromeMock.windows.get.mockResolvedValue(makeWindow({ id: 2 }));
    render(<App />);
    const b1 = await screen.findByText('B1');
    const row = b1.closest('li');
    if (!row) throw new Error('B1 所在行未找到');
    await userEvent.click(within(row).getByTitle('拆到新窗口'));
    await waitFor(() =>
      expect(chromeMock.windows.create).toHaveBeenCalledWith({
        tabId: 3,
        left: 40,
        top: 40,
        width: 1280,
        height: 800,
      }),
    );
    expect(chromeMock.windows.update).not.toHaveBeenCalledWith(9002, { state: 'maximized' });
  });

  it('新建窗口幽灵按钮：按默认尺寸策略（随最近聚焦窗口）创建空窗口', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    chromeMock.windows.getLastFocused.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('新建窗口')).toBeInTheDocument());
    // 按钮跟窗口卡片同在 win-flow 内 → 多列时按列排布，不独占一行
    expect(screen.getByText('新建窗口').closest('.win-flow')).not.toBeNull();
    await userEvent.click(screen.getByText('新建窗口'));
    await waitFor(() =>
      expect(chromeMock.windows.create).toHaveBeenCalledWith({
        left: 40,
        top: 40,
        width: 1280,
        height: 800,
      }),
    );
  });

  it('关闭窗口·窗口含管理页：无确认，只关非管理页 tab，窗口存活', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 1')).toBeInTheDocument());
    await userEvent.click(within(winBlockOf('窗口 1')).getByTitle('关闭窗口'));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
    expect(chromeMock.windows.remove).not.toHaveBeenCalled();
  });

  it('关闭窗口·窗口不含管理页：关整个窗口', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 2')).toBeInTheDocument());
    await userEvent.click(within(winBlockOf('窗口 2')).getByTitle('关闭窗口'));
    await waitFor(() => expect(chromeMock.windows.remove).toHaveBeenCalledWith(2));
    expect(chromeMock.tabs.remove).not.toHaveBeenCalled();
  });

  it('关闭窗口·windows.remove reject：区块摘掉 .closing，不永久消失', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    chromeMock.windows.remove.mockRejectedValueOnce(new Error('No window'));
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 2')).toBeInTheDocument());
    const section = winBlockOf('窗口 2');
    await userEvent.click(within(section).getByTitle('关闭窗口'));
    await waitFor(() => expect(chromeMock.windows.remove).toHaveBeenCalledWith(2));
    await waitFor(() => expect(section).not.toHaveClass('closing'), { timeout: 2000 });
  });

  it('关闭窗口·tabs.remove reject（管理页豁免场景）：区块摘掉 .closing，不永久消失', async () => {
    const { chromeMock } = getChromeMock();
    seedTwoWindows();
    chromeMock.tabs.remove.mockRejectedValueOnce(new Error('No tab'));
    render(<App />);
    await waitFor(() => expect(screen.getByText('窗口 1')).toBeInTheDocument());
    const section = winBlockOf('窗口 1');
    await userEvent.click(within(section).getByTitle('关闭窗口'));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
    await waitFor(() => expect(section).not.toHaveClass('closing'), { timeout: 2000 });
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
    // 待删行不再渲染额外 ✕ 标记（spec §5.4 2026-08-16 修订：避免与行操作区关闭按钮重复）
    expect(document.querySelector('.doom-mark')).toBeNull();

    await userEvent.unhover(screen.getByText(/一键去重/));
    expect(screen.getByText('D1').closest('li')).not.toHaveClass('dup-doomed');
  });

  it('按钮带待关数 −1；点击 → 关闭待删 tab（保留最近浏览）', async () => {
    const chromeMock = seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getByText('D1')).toBeInTheDocument());
    expect(screen.getByText('−1')).toBeInTheDocument();
    await userEvent.click(screen.getByText(/一键去重/));
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]));
  });

  it('悬停重复行：同组行同步高亮（spec §5.4）', async () => {
    seedDuplicates();
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('×2')).toHaveLength(2));
    await userEvent.hover(screen.getByText('D1'));
    expect(screen.getByText('D1').closest('li')).toHaveClass('dup-doomed');
    expect(screen.getByText('D2').closest('li')).toHaveClass('dup-keep');
    await userEvent.unhover(screen.getByText('D1'));
    expect(screen.getByText('D2').closest('li')).not.toHaveClass('dup-keep');
  });

  it('孤儿 tab（windowId 不在 windows.getAll() 里）不渲染、不计入 ×N、去重按钮不出现', async () => {
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
      // 孤儿：与 D1 同 URL，若未被过滤会被算作重复对象
      makeTab({
        id: 2,
        windowId: 99,
        index: 0,
        title: 'D2',
        url: 'https://d.com/',
        lastAccessed: 200,
      }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('D1')).toBeInTheDocument());
    expect(screen.queryByText('D2')).not.toBeInTheDocument();
    expect(screen.queryByText('×2')).not.toBeInTheDocument();
    // 无有效重复组 → 去重按钮不渲染（设计稿规则）
    expect(screen.queryByText(/一键去重/)).not.toBeInTheDocument();
  });
});

describe('稍后阅读', () => {
  it('空清单：aside 整个不渲染，.layout 满宽（no-aside）；收进条目后恢复双栏', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    expect(document.querySelector('aside')).toBeNull();
    expect(document.querySelector('.layout')).toHaveClass('no-aside');

    await userEvent.click(screen.getAllByTitle('收进稍后阅读（保存并关闭）')[0]);
    await waitFor(() => expect(document.querySelector('aside')).not.toBeNull());
    expect(document.querySelector('.layout')).not.toHaveClass('no-aside');
  });

  it('行内「收进稍后阅读」→ 落盘 + 关闭该 tab；面板出现条目', async () => {
    const { chromeMock, storageData } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
      makeTab({ id: 2, windowId: 1, index: 1, title: 'A2', url: 'https://x.com/' }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    // 空清单：整卡隐藏
    expect(screen.queryByText('稍后阅读')).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByTitle('收进稍后阅读（保存并关闭）')[0]);
    await waitFor(() => {
      expect((storageData.readLater as unknown[]).length).toBe(1);
    });
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]), {
      timeout: 2000,
    });
    expect(screen.getByText('稍后阅读')).toBeInTheDocument();
  });

  it('全部打开：一个新窗口带全部 URL，清单清空', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.readLater = [
      { id: 'r1', url: 'https://a.com/', title: 'RA', savedAt: 1 },
      { id: 'r2', url: 'https://b.com/', title: 'RB', savedAt: 2 },
    ];
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.windows.getAll.mockResolvedValue([]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('RA')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部打开'));
    await waitFor(() =>
      expect(chromeMock.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({ url: ['https://a.com/', 'https://b.com/'], focused: true }),
      ),
    );
    await waitFor(() => expect(storageData.readLater).toEqual([]));
  });
});

describe('保存窗口', () => {
  it('过滤后为空 → 不创建会话，toast 提示', async () => {
    const { chromeMock, storageData } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({
        id: 1,
        windowId: 1,
        index: 0,
        url: 'chrome://history/',
        title: 'History',
        active: true,
      }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByTitle('保存会话')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('保存会话'));
    expect(await screen.findByText('没有可保存的标签页')).toBeInTheDocument();
    expect(storageData.sessions).toBeUndefined();
  });

  it('正常路径：窗口内有可保存的 tab → 会话写入 storage，内容与快照一致', async () => {
    const { chromeMock, storageData } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, url: 'https://a.com/', title: 'A1', active: true }),
      makeTab({ id: 2, windowId: 1, index: 1, url: 'https://b.com/', title: 'B1' }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByTitle('保存会话')).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('保存会话'));
    await waitFor(() => expect(storageData.sessions).toBeDefined());
    const sessions = storageData.sessions as { tabs: { url: string }[] }[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tabs.map((t) => t.url)).toEqual(['https://a.com/', 'https://b.com/']);
  });

  it('恢复会话：新窗口带全部 url（尺寸遵循设置），只对 pinned 下标调用 tabs.update', async () => {
    const { chromeMock, storageData } = getChromeMock();
    storageData.sessions = [
      {
        id: 's1',
        name: '2026/8/15 09:00',
        createdAt: 1,
        tabs: [
          { url: 'https://a.com/', title: 'A', pinned: true },
          { url: 'https://b.com/', title: 'B' },
        ],
      },
    ];
    chromeMock.tabs.query.mockResolvedValue([]);
    chromeMock.windows.getAll.mockResolvedValue([]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    chromeMock.windows.create.mockResolvedValue({
      id: 9002,
      tabs: [
        makeTab({ id: 10, windowId: 9002, index: 0 }),
        makeTab({ id: 11, windowId: 9002, index: 1 }),
      ],
      // chrome-mock 的 create 实现里 tabs 字面量推断为 never[]，此处按其自身解析类型断言
    } as Awaited<ReturnType<typeof chromeMock.windows.create>>);
    chromeMock.tabs.update.mockResolvedValue(undefined);
    render(<App />);
    // 会话已迁入主区第三模式（spec §5.5 2026-08-16 修订）：默认窗口模式下不可见，需切段
    await waitFor(() => expect(screen.getByText('已保存会话')).toBeInTheDocument());
    expect(screen.queryByText(/2026\/8\/15 09:00/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('已保存会话'));
    await waitFor(() => expect(screen.getByText(/2026\/8\/15 09:00/)).toBeInTheDocument());
    await userEvent.click(screen.getByTitle('恢复到新窗口（会话保留）'));
    await waitFor(() =>
      expect(chromeMock.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: ['https://a.com/', 'https://b.com/'],
          focused: true,
        }),
      ),
    );
    await waitFor(() => expect(chromeMock.tabs.update).toHaveBeenCalledWith(10, { pinned: true }));
    expect(chromeMock.tabs.update).not.toHaveBeenCalledWith(11, { pinned: true });
    expect(chromeMock.tabs.update).toHaveBeenCalledTimes(1);
  });
});

describe('域名批量操作', () => {
  it('关闭该域名全部（跳过 pinned）', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.tabs.query.mockResolvedValue([
      makeTab({ id: 1, windowId: 1, index: 0, title: 'C1', url: 'https://c.com/1', active: true }),
      makeTab({ id: 2, windowId: 1, index: 1, title: 'C2', url: 'https://c.com/2', pinned: true }),
      makeTab({ id: 3, windowId: 1, index: 2, title: 'E1', url: 'https://e.com/' }),
    ]);
    chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 })]);
    chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 1 }));
    render(<App />);
    await waitFor(() => expect(screen.getByText('C1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部模式'));
    const closeButtons = screen.getAllByTitle('关闭该域名全部标签页（固定标签除外）');
    await userEvent.click(closeButtons[0]); // c.com 组（2 个）排最前
    await waitFor(() => expect(chromeMock.tabs.remove).toHaveBeenCalledWith([1]), {
      timeout: 2000,
    });
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
