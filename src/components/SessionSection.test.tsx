import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import SessionSection from './SessionSection';
import type { SavedSession } from '../lib/storage';

const sessions: SavedSession[] = [
  {
    id: 's1',
    name: '2026/8/15 10:00',
    createdAt: 100,
    tabs: [
      { url: 'https://a.com/', title: 'A' },
      { url: 'https://b.com/', title: 'B' },
    ],
  },
];

function renderSection(over: Partial<React.ComponentProps<typeof SessionSection>> = {}) {
  const props = {
    sessions,
    visibleLimit: 8 as const,
    expandedKeys: new Set<string>(),
    onToggleExpand: vi.fn(),
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onMoveTab: vi.fn(),
    onDeleteTab: vi.fn(),
    onOpenTab: vi.fn(),
    onOpenTabNewWindow: vi.fn(),
    ...over,
  };
  const view = render(
    <I18nProvider language="zh-CN">
      <SessionSection {...props} />
    </I18nProvider>,
  );
  return { props, view };
}

describe('SessionSection', () => {
  it('输入法组合中的 Enter/Escape 不提交或取消，确认候选后 Enter 才重命名', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getByRole('button', { name: '重命名' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'gong' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 });
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true, keyCode: 229 });
    expect(props.onRename).not.toHaveBeenCalled();
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '工作' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onRename).toHaveBeenCalledWith(sessions[0], '工作');
  });

  it('会话渲染为 win-block 卡片：名称、条目数、恢复 / 删除回调，标题不含保存时间', async () => {
    const { props, view } = renderSection();
    expect(
      view.container.querySelector('.win-flow > .win-block.session-block'),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026\/8\/15 10:00/)).toBeInTheDocument();
    expect(view.container.querySelector('.win-head .win-meta')).toHaveTextContent(/^2 个标签页$/);
    await userEvent.click(screen.getByRole('button', { name: '恢复到新窗口（保留已保存窗口）' }));
    expect(props.onRestore).toHaveBeenCalledWith(sessions[0]);
    await userEvent.click(screen.getByRole('button', { name: '删除已保存窗口' }));
    expect(props.onDelete).toHaveBeenCalledWith(sessions[0]);
  });

  it('条目直接平铺，无折叠箭头（spec §5.5 2026-08-16 修订）', () => {
    renderSection();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByTitle('展开')).not.toBeInTheDocument();
  });

  it('无会话时渲染空态文案', () => {
    renderSection({ sessions: [] });
    expect(screen.getByText(/还没有已保存窗口/)).toBeInTheDocument();
  });

  it('超出 visibleTabs 折叠，展开走 onToggleExpand（spec §5.2）', async () => {
    const many: SavedSession[] = [
      {
        id: 's2',
        name: '大会话',
        createdAt: 200,
        tabs: Array.from({ length: 10 }, (_, i) => ({
          url: `https://t${i}.com/`,
          title: `T${i}`,
        })),
      },
    ];
    const { props } = renderSection({ sessions: many, visibleLimit: 8 });
    expect(screen.getByText('T7')).toBeInTheDocument();
    expect(screen.queryByText('T8')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/还有 2 个标签页/));
    expect(props.onToggleExpand).toHaveBeenCalledWith('ss2');
  });
});

describe('SessionSection 条目操作', () => {
  it('点击条目标题 → onOpenTab；新窗口打开 → onOpenTabNewWindow；移除 → onDeleteTab', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getAllByTitle(/单独打开/)[0]);
    expect(props.onOpenTab).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByRole('button', { name: '新窗口打开' })[0]);
    expect(props.onOpenTabNewWindow).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByRole('button', { name: '移除此条' })[0]);
    expect(props.onDeleteTab).toHaveBeenCalledWith(sessions[0], 0);
  });

  it('重命名：切输入框，Enter 提交', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getByRole('button', { name: '重命名' }));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '工作会话{Enter}');
    expect(props.onRename).toHaveBeenCalledWith(sessions[0], '工作会话');
  });
});

describe('SessionSection 条目行对齐窗口模式（spec 2026-11-13-visual-polish）', () => {
  it('保留拖拽把手，标题与 URL 分两行，无独立域名列和时间列', () => {
    const { view } = renderSection();
    const row = view.container.querySelector('.session-block .tab-row');
    expect(row).toBeInTheDocument();
    expect(row!.querySelector('.drag-grip')).toBeInTheDocument();
    expect(row!.querySelector('.tab-text .tab-title')).toHaveTextContent('A');
    expect(row!.querySelector('.tab-text .tab-url')).toHaveTextContent('a.com/');
    expect(row!.querySelector('.tab-host')).not.toBeInTheDocument();
    expect(row!.querySelector('.tab-time')).not.toBeInTheDocument();
    expect(view.container.querySelector('.rl-url')).not.toBeInTheDocument();
    expect(view.container.querySelector('.session-tab-row')).not.toBeInTheDocument();
  });

  it.each([
    [
      'https://example.com/docs/guide?source=saved&lang=zh#details',
      'example.com/docs/guide?source=saved&lang=zh#details',
    ],
    [
      'http://example.com/a%20b?q=hello%20world#section',
      'example.com/a%20b?q=hello%20world#section',
    ],
    ['chrome://extensions/?id=test#details', 'chrome://extensions/?id=test#details'],
    [
      'file:///Users/test/Documents/guide.html#intro',
      'file:///Users/test/Documents/guide.html#intro',
    ],
  ])('展示完整地址 %s，悬停和点击使用原始 URL', async (url, text) => {
    const tab = { url, title: '已保存页面' };
    const { props } = renderSection({ sessions: [{ ...sessions[0], tabs: [tab] }] });

    const subtitle = screen.getByTitle(url);
    expect(subtitle).toHaveTextContent(text);
    await userEvent.click(subtitle);

    expect(props.onOpenTab).toHaveBeenCalledExactlyOnceWith(tab);
    expect(props.onOpenTabNewWindow).not.toHaveBeenCalled();
    expect(props.onDeleteTab).not.toHaveBeenCalled();
  });

  it('空 URL 仅显示标题，不生成空地址子标题', () => {
    const { view } = renderSection({
      sessions: [{ ...sessions[0], tabs: [{ title: '无地址页面', url: '' }] }],
    });

    expect(screen.getByText('无地址页面')).toBeInTheDocument();
    expect(view.container.querySelector('.tab-url')).not.toBeInTheDocument();
  });

  it('pinned 行：图钉图标 + ghost 态 grip', () => {
    const pinned: SavedSession[] = [
      {
        id: 's3',
        name: 'P',
        createdAt: 1,
        tabs: [{ url: 'https://a.com/', title: 'A', pinned: true }],
      },
    ];
    const { view } = renderSection({ sessions: pinned });
    expect(view.container.querySelector('.tab-pin')).toBeInTheDocument();
    expect(view.container.querySelector('.drag-grip.ghost')).toBeInTheDocument();
  });

  it('整行点击 → onOpenTab；行内按钮不触发整行打开', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getAllByTitle(/单独打开/)[0]);
    expect(props.onOpenTab).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByRole('button', { name: '新窗口打开' })[0]);
    expect(props.onOpenTabNewWindow).toHaveBeenCalledWith(sessions[0].tabs[0]);
    expect(props.onOpenTab).toHaveBeenCalledTimes(1);
  });
});
