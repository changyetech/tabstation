import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import App from './App';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
});

describe('设置页', () => {
  it('存储写入尚未完成时不显示成功反馈', async () => {
    const { chromeMock } = getChromeMock();
    render(<App />);
    await screen.findByText('⌘');
    const originalSet = chromeMock.storage.local.set.getMockImplementation()!;
    let complete!: () => Promise<void>;
    chromeMock.storage.local.set.mockImplementationOnce(
      (items) =>
        new Promise<void>((resolve) => {
          complete = async () => {
            await originalSet(items);
            resolve();
          };
        }),
    );

    await userEvent.click(screen.getByText('深色'));
    expect(screen.queryByText('主题已切换')).not.toBeInTheDocument();

    await act(() => complete());
    expect(await screen.findByText('主题已切换')).toBeInTheDocument();
  });

  it('写入失败显示失败反馈，不谎报成功，并恢复已保存设置', async () => {
    const { chromeMock } = getChromeMock();
    render(<App />);
    await screen.findByText('⌘');
    chromeMock.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));

    await userEvent.click(screen.getByText('深色'));

    expect(await screen.findByText('保存失败，请重试')).toBeInTheDocument();
    expect(screen.queryByText('主题已切换')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '自动（跟随系统）' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

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

  it('页脚展示版权链接并跳转官网', () => {
    render(<App />);

    const link = screen.getByRole('link', {
      name: 'Hangzhou Changye Network Technology Co., Ltd.',
    });
    expect(link).toHaveAttribute('href', 'https://changyetech.com');
    expect(screen.getAllByText(/Hangzhou Changye Network Technology Co\., Ltd\./)).toHaveLength(1);
  });

  it('主题卡片：点击深色 → 落盘 + data-theme 切换 + 分组反馈', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    await userEvent.click(screen.getByText('深色'));
    await waitFor(() => expect((storageData.settings as { theme: string }).theme).toBe('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByText('主题已切换')).toBeInTheDocument();
  });

  it('保存后关闭窗口：开关落盘并显示保存反馈', async () => {
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

  it('保存反馈位于对应分组，连续修改只保留最新分组的提示', async () => {
    render(<App />);
    const appearance = screen.getByRole('heading', { name: '外观' }).closest('section')!;
    const behavior = screen.getByRole('heading', { name: '行为' }).closest('section')!;
    await userEvent.click(screen.getByText('深色'));
    expect(within(appearance).getByRole('status')).toHaveTextContent('主题已切换');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(within(appearance).getByRole('status')).toBeEmptyDOMElement();
    expect(within(behavior).getByRole('status')).toHaveTextContent('已保存，即时生效');
  });

  it('语言切换后的保存反馈同步使用当前语言', async () => {
    render(<App />);
    await userEvent.selectOptions(screen.getByLabelText('界面语言'), 'en');
    const language = screen.getByRole('heading', { name: 'Language' }).closest('section')!;
    expect(within(language).getByRole('status')).toHaveTextContent('Saved');
  });

  it('连续保存重置提示时限，2.2 秒后清空', async () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('深色'));
    expect(screen.getAllByRole('status').some((el) => el.closest('#appearance'))).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(1500));
    fireEvent.click(screen.getByText('浅色'));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByText('主题已切换')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(1200));
    expect(screen.queryByText('主题已切换')).not.toBeInTheDocument();
  });

  it('展示条数：选 16 落盘为数字，选全部落盘为 all', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    const select = screen.getByLabelText('每个区块默认展示条数');
    await userEvent.selectOptions(select, '16');
    await waitFor(() =>
      expect((storageData.settings as { visibleTabs: unknown }).visibleTabs).toBe(16),
    );
    await userEvent.selectOptions(select, 'all');
    await waitFor(() =>
      expect((storageData.settings as { visibleTabs: unknown }).visibleTabs).toBe('all'),
    );
  });

  it('默认视图：默认全部模式，切窗口模式落盘（default-view spec）', async () => {
    const { storageData } = getChromeMock();
    render(<App />);
    const select = screen.getByLabelText('默认视图');
    expect(select).toHaveValue('all');
    // 已保存窗口不作为默认视图选项
    expect(screen.queryByRole('option', { name: '已保存窗口' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'window');
    await waitFor(() =>
      expect((storageData.settings as { defaultView: string }).defaultView).toBe('window'),
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
