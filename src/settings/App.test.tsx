import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import App from './App';

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe('设置页', () => {
  it('渲染五个分组与版本号', async () => {
    render(<App />);
    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText(/所有改动即时保存/)).toBeInTheDocument();
    expect(screen.getAllByText('外观').length).toBeGreaterThan(0);
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
    expect(screen.getByText(/版本 0\.1\.0/)).toBeInTheDocument();
    // 快捷键读取实际绑定（chrome-mock 返回 ⌘⇧E）
    await waitFor(() => expect(screen.getByText('⌘')).toBeInTheDocument());
  });

  it('主题卡片：点击深色 → 落盘 + data-theme 切换 + toast', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.click(screen.getByText('深色'));
    await waitFor(() => expect((storageData.settings as { theme: string }).theme).toBe('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByText('主题已切换')).toBeInTheDocument();
  });

  it('保存会话后关闭窗口：开关落盘并弹保存 toast', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() =>
      expect((storageData.settings as { closeWindowAfterSave: boolean }).closeWindowAfterSave).toBe(
        true,
      ),
    );
    expect(screen.getByText('已保存，即时生效')).toBeInTheDocument();
  });

  it('展示条数：选 12 落盘为数字，选全部落盘为 all', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    const select = screen.getByLabelText('每个窗口默认展示条数');
    await userEvent.selectOptions(select, '12');
    await waitFor(() =>
      expect((storageData.settings as { visibleTabs: unknown }).visibleTabs).toBe(12),
    );
    await userEvent.selectOptions(select, 'all');
    await waitFor(() =>
      expect((storageData.settings as { visibleTabs: unknown }).visibleTabs).toBe('all'),
    );
  });

  it('新窗口默认行为：切换落盘', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.selectOptions(screen.getByLabelText('新窗口默认行为'), 'max');
    await waitFor(() =>
      expect((storageData.settings as { newWindowMode: string }).newWindowMode).toBe('max'),
    );
  });

  it('管理页单例：切每窗口一个落盘', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.click(screen.getByText('每窗口一个'));
    await waitFor(() =>
      expect((storageData.settings as { managerPageScope: string }).managerPageScope).toBe(
        'per-window',
      ),
    );
  });

  it('语言切换立即生效：落盘且界面文案切英文', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.selectOptions(screen.getByLabelText('界面语言'), 'en');
    await waitFor(() => expect((storageData.settings as { language: string }).language).toBe('en'));
    expect(await screen.findByText('Settings')).toBeInTheDocument();
  });

  it('「在 Chrome 中修改」打开扩展快捷键页', async () => {
    const { chromeMock } = getChromeMock();
    render(<App />);
    await userEvent.click(screen.getByText('在 Chrome 中修改'));
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'chrome://extensions/shortcuts' });
  });
});

describe('设置页与管理页联动', () => {
  it('storage.onChanged 外部变更 → 本页控件即时同步', async () => {
    const { chromeMock } = getChromeMock();
    render(<App />);
    await waitFor(() => expect(screen.getByLabelText('新窗口默认行为')).toHaveValue('same'));
    // 模拟另一页写入
    await chromeMock.storage.local.set({
      settings: { newWindowMode: 'max' },
    });
    await waitFor(() => expect(screen.getByLabelText('新窗口默认行为')).toHaveValue('max'));
  });
});
