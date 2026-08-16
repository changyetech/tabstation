import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import ReadLaterSidebar from './ReadLaterSidebar';
import type { ReadLaterItem } from '../lib/storage';

const items: ReadLaterItem[] = [
  { id: 'r1', url: 'https://a.com/', title: 'Article A', savedAt: 100 },
];

function renderPanel(over: Partial<React.ComponentProps<typeof ReadLaterSidebar>> = {}) {
  const props = {
    items,
    now: Date.now(),
    onOpen: vi.fn(),
    onOpenNewWindow: vi.fn(),
    onOpenAll: vi.fn(),
    onDelete: vi.fn(),
    ...over,
  };
  render(
    <I18nProvider language="zh-CN">
      <ReadLaterSidebar {...props} />
    </I18nProvider>,
  );
  return props;
}

describe('ReadLaterSidebar', () => {
  it('点击条目标题 → onOpen', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByText('Article A'));
    expect(props.onOpen).toHaveBeenCalledWith(items[0]);
  });

  it('新窗口打开 / 删除 各自回调，不触发 onOpen', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByTitle('新窗口打开（并从清单移除）'));
    expect(props.onOpenNewWindow).toHaveBeenCalledWith(items[0]);
    await userEvent.click(screen.getByTitle('从清单删除'));
    expect(props.onDelete).toHaveBeenCalled();
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('「全部打开」仅非空时显示并回调', async () => {
    const props = renderPanel();
    await userEvent.click(screen.getByText('全部打开'));
    expect(props.onOpenAll).toHaveBeenCalled();
  });

  it('空清单：整卡隐藏，不渲染任何内容', () => {
    renderPanel({ items: [] });
    expect(screen.queryByText('稍后阅读')).not.toBeInTheDocument();
    expect(screen.queryByText('全部打开')).not.toBeInTheDocument();
  });
});
