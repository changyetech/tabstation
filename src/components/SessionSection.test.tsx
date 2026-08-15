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
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onReorderTab: vi.fn(),
    onDeleteTab: vi.fn(),
    onOpenTab: vi.fn(),
    ...over,
  };
  render(
    <I18nProvider language="zh-CN">
      <SessionSection {...props} />
    </I18nProvider>,
  );
  return props;
}

describe('SessionSection', () => {
  it('显示会话名与 tab 数，[打开]/[删除] 回调', async () => {
    const props = renderSection();
    expect(screen.getByText(/2026\/8\/15 10:00/)).toBeInTheDocument();
    expect(screen.getByText(/2 个 tab/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('打开'));
    expect(props.onRestore).toHaveBeenCalledWith(sessions[0]);
    await userEvent.click(screen.getByText('删除'));
    expect(props.onDelete).toHaveBeenCalledWith(sessions[0]);
  });

  it('无会话时整个分区不渲染', () => {
    renderSection({ sessions: [] });
    expect(screen.queryByText('已保存会话')).not.toBeInTheDocument();
  });
});
