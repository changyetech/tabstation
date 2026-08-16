import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import MoveMenu, { type MoveTarget } from './MoveMenu';

describe('MoveMenu', () => {
  it('popover 只列其他窗口（无新窗口选项），点击回调', async () => {
    const onPick = vi.fn();
    const targets: MoveTarget[] = [
      { windowId: 2, label: '窗口 2 · Doc', tabCount: 3 },
      { windowId: 3, label: '窗口 3 · News', tabCount: 1 },
    ];
    render(
      <I18nProvider language="zh-CN">
        <MoveMenu targets={targets} onPick={onPick} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByTitle('移动到其他窗口'));
    expect(screen.getByText('移动到窗口')).toBeInTheDocument();
    expect(screen.queryByText(/新窗口/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('窗口 2 · Doc'));
    expect(onPick).toHaveBeenCalledWith(targets[0]);
    // 选择后菜单关闭
    expect(screen.queryByText('移动到窗口')).not.toBeInTheDocument();
  });
});
