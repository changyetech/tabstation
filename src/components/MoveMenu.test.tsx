import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import MoveMenu, { type MoveTarget } from './MoveMenu';

describe('MoveMenu', () => {
  it('列出其他窗口与两种新窗口选项，点击回调', async () => {
    const onPick = vi.fn();
    const targets: MoveTarget[] = [
      { kind: 'window', windowId: 2, label: '窗口 2 · Doc (3 个 tab)' },
      { kind: 'new-maximized' },
      { kind: 'new-same-size' },
    ];
    render(
      <I18nProvider language="zh-CN">
        <MoveMenu targets={targets} onPick={onPick} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByText(/移动到/));
    await userEvent.click(screen.getByText('窗口 2 · Doc (3 个 tab)'));
    expect(onPick).toHaveBeenCalledWith(targets[0]);
    await userEvent.click(screen.getByText(/移动到/));
    await userEvent.click(screen.getByText('新窗口（全屏）'));
    expect(onPick).toHaveBeenCalledWith({ kind: 'new-maximized' });
  });
});
