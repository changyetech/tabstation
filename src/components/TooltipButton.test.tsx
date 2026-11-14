import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TooltipButton from './TooltipButton';

afterEach(() => vi.useRealTimers());

describe('操作按钮快速提示', () => {
  it('悬停 150ms 显示，移出立即关闭，且不生成原生 title', () => {
    vi.useFakeTimers();
    render(<TooltipButton title="关闭标签页">×</TooltipButton>);
    const button = screen.getByRole('button', { name: '关闭标签页' });
    expect(button).toHaveAttribute('title', '');
    fireEvent.pointerEnter(button, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(149));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('tooltip')).toHaveTextContent('关闭标签页');
    expect(screen.getByRole('tooltip').parentElement).toBe(document.body);
    fireEvent.pointerLeave(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('快速划过和卸载会取消待显示提示', () => {
    vi.useFakeTimers();
    const { unmount } = render(<TooltipButton title="关闭">×</TooltipButton>);
    const button = screen.getByRole('button');
    fireEvent.pointerEnter(button);
    fireEvent.pointerLeave(button);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerEnter(button);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('聚焦立即显示，Escape 和点击关闭且保留调用方事件', () => {
    const onClick = vi.fn();
    const onFocus = vi.fn();
    render(
      <TooltipButton title="移动" onClick={onClick} onFocus={onFocus}>
        →
      </TooltipButton>,
    );
    const button = screen.getByRole('button');
    fireEvent.focus(button);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.focus(button);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
  it('靠近视口右下角时向上显示并限制横向位置，滚动后关闭', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    rect.mockImplementation(function (this: HTMLElement) {
      return (
        this.tagName === 'BUTTON'
          ? { left: 990, top: 740, bottom: 760, width: 20, height: 20, right: 1010 }
          : { left: 0, top: 0, bottom: 30, width: 120, height: 30, right: 120 }
      ) as DOMRect;
    });
    try {
      render(<TooltipButton title="新窗口打开">↗</TooltipButton>);
      fireEvent.focus(screen.getByRole('button'));
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveStyle({ left: '896px', top: '702px' });
      fireEvent.scroll(window);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    } finally {
      rect.mockRestore();
    }
  });
  it.each(['scroll', 'resize', 'blur'])('等待显示期间 %s 会取消提示', (event) => {
    vi.useFakeTimers();
    render(<TooltipButton title="关闭">×</TooltipButton>);
    fireEvent.pointerEnter(screen.getByRole('button'));
    act(() => window.dispatchEvent(new Event(event)));
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
