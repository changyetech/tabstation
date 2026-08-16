import { render, screen } from '@testing-library/react';
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
  it('会话渲染为 win-block 卡片：名称、条目数、恢复 / 删除回调，标题不含保存时间', async () => {
    const { props, view } = renderSection();
    expect(view.container.querySelector('.win-flow > .win-block.session-block')).toBeInTheDocument();
    expect(screen.getByText(/2026\/8\/15 10:00/)).toBeInTheDocument();
    expect(view.container.querySelector('.win-head .win-meta')).toHaveTextContent(/^2 个标签页$/);
    await userEvent.click(screen.getByTitle('恢复到新窗口（会话保留）'));
    expect(props.onRestore).toHaveBeenCalledWith(sessions[0]);
    await userEvent.click(screen.getByTitle('删除会话'));
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
    expect(screen.getByText(/还没有已保存的会话/)).toBeInTheDocument();
  });

  it('超出 visibleTabs 折叠，展开走 onToggleExpand（spec §5.2）', async () => {
    const many: SavedSession[] = [
      {
        id: 's2',
        name: '大会话',
        createdAt: 200,
        tabs: Array.from({ length: 7 }, (_, i) => ({
          url: `https://t${i}.com/`,
          title: `T${i}`,
        })),
      },
    ];
    const { props } = renderSection({ sessions: many, visibleLimit: 5 });
    expect(screen.getByText('T4')).toBeInTheDocument();
    expect(screen.queryByText('T5')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/还有 2 个标签页/));
    expect(props.onToggleExpand).toHaveBeenCalledWith('ss2');
  });
});

describe('SessionSection 条目操作', () => {
  it('点击条目标题 → onOpenTab；新窗口打开 → onOpenTabNewWindow；移除 → onDeleteTab', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getAllByTitle(/单独打开/)[0]);
    expect(props.onOpenTab).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByTitle('新窗口打开')[0]);
    expect(props.onOpenTabNewWindow).toHaveBeenCalledWith(sessions[0].tabs[0]);
    await userEvent.click(screen.getAllByTitle('移除此条')[0]);
    expect(props.onDeleteTab).toHaveBeenCalledWith(sessions[0], 0);
  });

  it('重命名：切输入框，Enter 提交', async () => {
    const { props } = renderSection();
    await userEvent.click(screen.getByTitle('重命名'));
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '工作会话{Enter}');
    expect(props.onRename).toHaveBeenCalledWith(sessions[0], '工作会话');
  });
});

describe('SessionSection 条目行对齐 by windows（spec 2026-08-16-session-card-dnd §2）', () => {
  it('行为 tab-row 结构：grip 把手、域名列，无时间列、无 URL 子标题', () => {
    const { view } = renderSection();
    const row = view.container.querySelector('.session-block .tab-row');
    expect(row).toBeInTheDocument();
    expect(row!.querySelector('.drag-grip')).toBeInTheDocument();
    expect(row!.querySelector('.tab-host')!.textContent).toBe('a.com');
    expect(row!.querySelector('.tab-time')).not.toBeInTheDocument();
    expect(view.container.querySelector('.rl-url')).not.toBeInTheDocument();
    expect(view.container.querySelector('.session-tab-row')).not.toBeInTheDocument();
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
    await userEvent.click(screen.getAllByTitle('新窗口打开')[0]);
    expect(props.onOpenTabNewWindow).toHaveBeenCalledWith(sessions[0].tabs[0]);
    expect(props.onOpenTab).toHaveBeenCalledTimes(1);
  });
});
