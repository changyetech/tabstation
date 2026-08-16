import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { CopyrightFooter } from './CopyrightFooter';

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyrightFooter', () => {
  it('年份不可点击，仅公司名链接官网', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00'));

    render(
      <I18nProvider language="zh-CN">
        <CopyrightFooter />
      </I18nProvider>,
    );

    expect(screen.getByText('© 2026')).not.toHaveRole('link');
    const link = screen.getByRole('link', {
      name: 'Hangzhou Changye Network Technology Co., Ltd.',
    });
    expect(link).toHaveAttribute('href', 'https://changyetech.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });
});
