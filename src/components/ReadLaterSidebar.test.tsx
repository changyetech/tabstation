import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import ReadLaterSidebar from './ReadLaterSidebar';
import type { ReadLaterItem } from '../lib/storage';

const items: ReadLaterItem[] = [
  { id: 'r1', url: 'https://a.com/', title: 'Article A', savedAt: 100 },
];

describe('ReadLaterSidebar', () => {
  it('点击条目标题 → onOpen', async () => {
    const onOpen = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <ReadLaterSidebar items={items} onOpen={onOpen} onDelete={vi.fn()} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByText('Article A'));
    expect(onOpen).toHaveBeenCalledWith(items[0]);
  });

  it('点击 ✕ → onDelete（不触发 onOpen）', async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <ReadLaterSidebar items={items} onOpen={onOpen} onDelete={onDelete} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByTitle('删除'));
    expect(onDelete).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
