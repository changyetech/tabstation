import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { CopyrightFooter } from './CopyrightFooter';

afterEach(() => {
  vi.useRealTimers();
});

function renderFooter(props: { showOptions?: boolean } = {}) {
  return render(
    <I18nProvider language="zh-CN">
      <CopyrightFooter {...props} />
    </I18nProvider>,
  );
}

describe('CopyrightFooter', () => {
  it('年份不可点击，仅公司名链接官网', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00'));

    renderFooter();

    expect(screen.getByText('© 2026')).not.toHaveRole('link');
    const link = screen.getByRole('link', {
      name: 'Hangzhou Changye Network Technology Co., Ltd.',
    });
    expect(link).toHaveAttribute('href', 'https://changyetech.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('品牌名链接产品官网', () => {
    renderFooter();

    const link = screen.getByRole('link', { name: 'Tab Station' });
    expect(link).toHaveAttribute('href', 'https://tabstation.omnikit.run');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('默认不渲染设置入口', () => {
    renderFooter();

    expect(screen.queryByRole('button', { name: '设置' })).toBeNull();
  });

  it('showOptions 时点击设置打开设置页', async () => {
    renderFooter({ showOptions: true });

    await userEvent.click(screen.getByRole('button', { name: '设置' }));

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});
