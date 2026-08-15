import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab, makeWindow } from '../test/factories';
import WindowSection from './WindowSection';

const noop = () => undefined;

function renderSection(props: Partial<React.ComponentProps<typeof WindowSection>> = {}) {
  const tabs = [
    makeTab({ id: 1, title: 'Active Doc', active: true, index: 0 }),
    makeTab({ id: 2, title: 'Other', index: 1 }),
  ];
  return render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <WindowSection
          window={makeWindow({ id: 1 })}
          windowNumber={2}
          tabs={tabs}
          isCurrent={false}
          draggable={false}
          view="list"
          dupCountByTabId={new Map()}
          now={Date.now()}
          registerRow={noop}
          onCloseTab={noop}
          {...props}
        />
      </DndContext>
    </I18nProvider>,
  );
}

describe('WindowSection', () => {
  it('标题 = 窗口 N · 活动 tab 标题 (M 个 tab)', () => {
    renderSection();
    expect(screen.getByRole('heading')).toHaveTextContent('窗口 2 · Active Doc (2 个 tab)');
  });
  it('当前窗口带（当前窗口）标记', () => {
    renderSection({ isCurrent: true });
    expect(screen.getByRole('heading')).toHaveTextContent(
      '窗口 2（当前窗口） · Active Doc (2 个 tab)',
    );
  });
  it('渲染全部行', () => {
    renderSection();
    expect(screen.getByText('Active Doc')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});

describe('WindowSection 关闭窗口', () => {
  it('确认通过 → 回调；取消 → 不回调', async () => {
    const onCloseWindow = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderSection({ onCloseWindow });
    await userEvent.click(screen.getByText(/关闭窗口/));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('及其 2 个 tab'));
    // R1：{name} 只用「窗口 N」，不能带完整分区标题（不含活动标题、tab 数、"·"）
    expect(window.confirm).toHaveBeenCalledWith('关闭窗口 2 及其 2 个 tab？');
    expect(onCloseWindow).toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    await userEvent.click(screen.getByText(/关闭窗口/));
    expect(onCloseWindow).toHaveBeenCalledTimes(1);
  });

  it('未传 onCloseWindow 时不渲染按钮', () => {
    renderSection();
    expect(screen.queryByText(/关闭窗口/)).not.toBeInTheDocument();
  });
});
