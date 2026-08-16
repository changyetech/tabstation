import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab } from '../test/factories';
import DomainGroupList from './DomainGroupList';

const noop = () => undefined;

const tabs = [
  makeTab({ id: 1, url: 'https://b.com/1', title: 'B1' }),
  makeTab({ id: 2, url: 'https://a.com/1', title: 'A1' }),
  makeTab({ id: 3, url: 'https://a.com/2', title: 'A2' }),
  makeTab({ id: 4, url: 'file:///x.pdf', title: 'F1' }),
];

function renderList(over: Partial<React.ComponentProps<typeof DomainGroupList>> = {}) {
  const props = {
    tabs,
    now: Date.now(),
    dupCountByTabId: new Map<number, number>(),
    previewByTabId: new Map<number, 'keep' | 'close'>(),
    dedupePreview: false,
    visibleLimit: 8 as const,
    expandedKeys: new Set<string>(),
    onToggleExpand: noop,
    registerRow: noop,
    onCloseTab: noop,
    onDomainReadLater: vi.fn(),
    onDomainSplit: vi.fn(),
    onDomainCloseAll: vi.fn(),
    ...over,
  };
  render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <DomainGroupList {...props} />
      </DndContext>
    </I18nProvider>,
  );
  return props;
}

describe('DomainGroupList', () => {
  it('按域名聚合为区块：tab 数降序、特殊组文案', () => {
    renderList();
    const titles = [...document.querySelectorAll('.win-block .win-title')].map(
      (el) => el.textContent,
    );
    expect(titles[0]).toContain('a.com');
    expect(titles.some((x) => x?.includes('本地文件'))).toBe(true);
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('域名批量操作：关闭全部回调带该域名的 tab 集', async () => {
    const props = renderList();
    await userEvent.click(screen.getAllByTitle('关闭该域名全部标签页（固定标签除外）')[0]);
    expect(props.onDomainCloseAll).toHaveBeenCalledWith([tabs[1], tabs[2]]);
  });

  it('favicon 仅在域名头显示，标签行内不逐行显示（spec §5.1）', () => {
    renderList();
    const heads = document.querySelectorAll('.win-head .win-title .favicon');
    expect(heads.length).toBeGreaterThan(0);
    expect(document.querySelector('.tab-row .favicon')).toBeNull();
  });

  it('去重预览：只保留重复组成员，空组隐藏', () => {
    renderList({
      dedupePreview: true,
      previewByTabId: new Map([
        [2, 'keep'],
        [3, 'close'],
      ]),
    });
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.queryByText('B1')).not.toBeInTheDocument();
    expect(screen.queryByText('F1')).not.toBeInTheDocument();
  });
});
