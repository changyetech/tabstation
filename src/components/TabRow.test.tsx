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
  it('展示标题、域名、📌 与 ×N 徽标', () => {
    const tab = makeTab({
      title: 'My Page',
      url: 'https://www.a.com/p',
      pinned: true,
      lastAccessed: Date.now() - 3 * 60_000,
    });
    renderRow(
      <TabRow tab={tab} dupCount={2} draggable={false} registerRow={noop} onClose={noop} />,
    );
    expect(screen.getByText('My Page')).toBeInTheDocument();
    expect(screen.getByText('www.a.com')).toBeInTheDocument();
    expect(screen.getByText('📌')).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('lastAccessed 缺失显示 —，60 秒内显示 刚刚', () => {
    const t1 = makeTab({ id: 1, lastAccessed: undefined });
    const t2 = makeTab({ id: 2, lastAccessed: Date.now() - 10_000 });
    renderRow(
      <>
        <TabRow tab={t1} draggable={false} registerRow={noop} onClose={noop} />
        <TabRow tab={t2} draggable={false} registerRow={noop} onClose={noop} />
      </>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('刚刚')).toBeInTheDocument();
  });

  it('跳转：聚焦所在窗口并激活 tab', async () => {
    const { chromeMock } = getChromeMock();
    const tab = makeTab({ id: 5, windowId: 3 });
    renderRow(<TabRow tab={tab} draggable={false} registerRow={noop} onClose={noop} />);
    await userEvent.click(screen.getByTitle('跳转'));
    expect(chromeMock.windows.update).toHaveBeenCalledWith(3, { focused: true });
    expect(chromeMock.tabs.update).toHaveBeenCalledWith(5, { active: true });
  });

  it('关闭按钮回调 onClose', async () => {
    const onClose = vi.fn();
    const tab = makeTab({ id: 5 });
    renderRow(<TabRow tab={tab} draggable={false} registerRow={noop} onClose={onClose} />);
    await userEvent.click(screen.getByTitle('关闭'));
    expect(onClose).toHaveBeenCalledWith(tab);
  });
});
