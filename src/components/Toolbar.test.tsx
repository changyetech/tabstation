import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { getChromeMock } from '../test/chrome-mock';
import Toolbar from './Toolbar';

function renderToolbar(over: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props = {
    mode: 'window' as const,
    view: 'list' as const,
    onMode: vi.fn(),
    onView: vi.fn(),
    ...over,
  };
  render(
    <I18nProvider language="zh-CN">
      <Toolbar {...props} />
    </I18nProvider>,
  );
  return props;
}

describe('Toolbar', () => {
  it('切换模式与视图', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByText('全部模式'));
    expect(props.onMode).toHaveBeenCalledWith('all');
    await userEvent.click(screen.getByText('域名'));
    expect(props.onView).toHaveBeenCalledWith('domain');
  });

  it('历史按钮：新 tab 打开 chrome://history', async () => {
    const { chromeMock } = getChromeMock();
    renderToolbar();
    await userEvent.click(screen.getByText(/历史/));
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'chrome://history' });
  });
});
