import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { DEFAULT_SETTINGS } from '../lib/storage';
import SettingsDialog from './SettingsDialog';

describe('SettingsDialog', () => {
  it('open=false 不渲染', () => {
    const { container } = render(
      <I18nProvider language="zh-CN">
        <SettingsDialog
          open={false}
          settings={DEFAULT_SETTINGS}
          onChange={vi.fn()}
          onClose={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('切换语言 → onChange 带新 language', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <SettingsDialog open settings={DEFAULT_SETTINGS} onChange={onChange} onClose={vi.fn()} />
      </I18nProvider>,
    );
    await userEvent.selectOptions(screen.getByRole('combobox'), 'zh-CN');
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, language: 'zh-CN' });
  });

  it('切换单例范围与保存后关窗', async () => {
    const onChange = vi.fn();
    render(
      <I18nProvider language="zh-CN">
        <SettingsDialog open settings={DEFAULT_SETTINGS} onChange={onChange} onClose={vi.fn()} />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByLabelText('每窗口一个'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, managerPageScope: 'per-window' });
    await userEvent.click(screen.getByLabelText('保存会话后关闭窗口'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, closeWindowAfterSave: true });
  });
});
