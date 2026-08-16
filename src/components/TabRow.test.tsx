import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab } from '../test/factories';
import TabRow from './TabRow';

// useSortable 需处于 SortableContext 内，测试包一层空列表 context
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function renderRow(ui: React.ReactElement) {
  return render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <SortableContext items={[1, 2, 5]} strategy={verticalListSortingStrategy}>
          <ul>{ui}</ul>
        </SortableContext>
      </DndContext>
    </I18nProvider>,
  );
}
const noop = () => undefined;

describe('TabRow', () => {
  it('展示标题、域名、固定标记与 ×N 徽标', () => {
    const tab = makeTab({
      title: 'My Page',
      url: 'https://www.a.com/p',
      pinned: true,
      lastAccessed: Date.now() - 3 * 60_000,
    });
    renderRow(
      <TabRow
        tab={tab}
        dupCount={2}
        draggable={false}
        now={Date.now()}
        registerRow={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.getByText('www.a.com')).toBeInTheDocument();
    expect(screen.getByTitle('固定标签')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('favicon 统一经 Chrome 本地缓存按 URL 取图；无 URL 回退字母徽标', () => {
    const t1 = makeTab({ id: 1, url: 'https://www.a.com/p' });
    const t2 = makeTab({ id: 2, url: undefined, title: 'NoUrl' });
    const { container } = renderRow(
      <>
        <TabRow tab={t1} draggable={false} now={Date.now()} registerRow={noop} onClose={noop} />
        <TabRow tab={t2} draggable={false} now={Date.now()} registerRow={noop} onClose={noop} />
      </>,
    );
    const img = container.querySelector<HTMLImageElement>('img.favicon');
    expect(img?.src).toBe(
      'chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fwww.a.com%2Fp&size=32',
    );
    // 无 URL 的行回退字母徽标（span.favicon，显示 ?）
    expect(container.querySelectorAll('img.favicon')).toHaveLength(1);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('lastAccessed 缺失显示 —，60 秒内显示 刚刚', () => {
    const now = Date.now();
    const t1 = makeTab({ id: 1, lastAccessed: undefined });
    const t2 = makeTab({ id: 2, lastAccessed: now - 10_000 });
    renderRow(
      <>
        <TabRow tab={t1} draggable={false} now={now} registerRow={noop} onClose={noop} />
        <TabRow tab={t2} draggable={false} now={now} registerRow={noop} onClose={noop} />
      </>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('整行可点 = 跳转：聚焦所在窗口并激活 tab（设计稿 tab-line）', async () => {
    const { chromeMock } = getChromeMock();
    const tab = makeTab({ id: 5, windowId: 3, title: 'Row' });
    renderRow(
      <TabRow tab={tab} draggable={false} now={Date.now()} registerRow={noop} onClose={noop} />,
    );
    await userEvent.click(screen.getByText('Row'));
    expect(chromeMock.windows.update).toHaveBeenCalledWith(3, { focused: true });
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(5, { active: true });
  });

  it('关闭按钮回调 onClose，且不冒泡触发跳转', async () => {
    const { chromeMock } = getChromeMock();
    const onClose = vi.fn();
    const tab = makeTab({ id: 5 });
    renderRow(
      <TabRow tab={tab} draggable={false} now={Date.now()} registerRow={noop} onClose={onClose} />,
    );
    await userEvent.click(screen.getByTitle('关闭标签页'));
    expect(onClose).toHaveBeenCalledWith(tab);
    expect(chromeMock.tabs.update).not.toHaveBeenCalled();
  });

  it('拆到新窗口按钮：非 pinned 渲染并回调；pinned 不渲染', async () => {
    const onSplit = vi.fn();
    const t1 = makeTab({ id: 1, pinned: false });
    const t2 = makeTab({ id: 2, pinned: true });
    renderRow(
      <>
        <TabRow
          tab={t1}
          draggable={false}
          now={Date.now()}
          registerRow={noop}
          onClose={noop}
          onSplit={onSplit}
        />
        <TabRow
          tab={t2}
          draggable={false}
          now={Date.now()}
          registerRow={noop}
          onClose={noop}
          onSplit={onSplit}
        />
      </>,
    );
    expect(screen.getAllByTitle('拆到新窗口')).toHaveLength(1);
    await userEvent.click(screen.getByTitle('拆到新窗口'));
    expect(onSplit).toHaveBeenCalledWith(t1);
  });

  it('移动按钮：pinned 也可移动（设计稿语义），无目标时不渲染', () => {
    const t1 = makeTab({ id: 1, pinned: true });
    const t2 = makeTab({ id: 2 });
    renderRow(
      <>
        <TabRow
          tab={t1}
          draggable={false}
          now={Date.now()}
          registerRow={noop}
          onClose={noop}
          getMoveTargets={() => [{ windowId: 9, label: '窗口 9 · X', tabCount: 1 }]}
          onMove={noop}
        />
        <TabRow
          tab={t2}
          draggable={false}
          now={Date.now()}
          registerRow={noop}
          onClose={noop}
          getMoveTargets={() => []}
          onMove={noop}
        />
      </>,
    );
    expect(screen.getAllByTitle('移动到其他窗口')).toHaveLength(1);
  });

  it('悬停重复行上报 onHoverDup', async () => {
    const onHoverDup = vi.fn();
    const tab = makeTab({ id: 1, title: 'Dup' });
    renderRow(
      <TabRow
        tab={tab}
        dupCount={2}
        draggable={false}
        now={Date.now()}
        registerRow={noop}
        onClose={noop}
        onHoverDup={onHoverDup}
      />,
    );
    await userEvent.hover(screen.getByText('Dup'));
    expect(onHoverDup).toHaveBeenCalledWith(1);
    await userEvent.unhover(screen.getByText('Dup'));
    expect(onHoverDup).toHaveBeenCalledWith(null);
  });
});
