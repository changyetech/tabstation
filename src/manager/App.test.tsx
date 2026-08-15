import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { makeTab, makeWindow } from '../test/factories';
import App from './App';

const MANAGER = 'chrome-extension://test-id/src/manager/index.html';

function seedTwoWindows() {
  const { chromeMock } = getChromeMock();
  chromeMock.tabs.query.mockResolvedValue([
    makeTab({ id: 1, windowId: 1, index: 0, title: 'A1', url: 'https://a.com/', active: true }),
    makeTab({ id: 2, windowId: 1, index: 1, title: 'Manager', url: MANAGER }),
    makeTab({ id: 3, windowId: 2, index: 0, title: 'B1', url: 'https://b.com/', active: true }),
  ]);
  chromeMock.windows.getAll.mockResolvedValue([makeWindow({ id: 1 }), makeWindow({ id: 2 })]);
  chromeMock.windows.getCurrent.mockResolvedValue(makeWindow({ id: 2 }));
}

describe('App', () => {
  it('窗口模式：当前窗口置顶、管理页隐身且不计数', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2));
    const headings = screen.getAllByRole('heading', { level: 2 });
    // 当前窗口（id=2，序号 2）置顶
    expect(headings[0]).toHaveTextContent('窗口 2（当前窗口）');
    // 窗口 1 有 2 个真实 tab，但管理页隐身 → 只计 1 个
    expect(headings[1]).toHaveTextContent('(1 个 tab)');
    expect(screen.queryByText('Manager')).not.toBeInTheDocument();
  });

  it('全部模式：合并为一份列表（按窗口顺序 + index）', async () => {
    seedTwoWindows();
    render(<App />);
    await waitFor(() => expect(screen.getByText('A1')).toBeInTheDocument());
    await userEvent.click(screen.getByText('全部模式'));
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    const titles = screen.getAllByText(/^(A1|B1)$/).map((el) => el.textContent);
    expect(titles).toEqual(['A1', 'B1']);
  });
});

describe('测试 harness 冒烟', () => {
  it('chrome mock：storage 读写往返且触发 onChanged', async () => {
    const { chromeMock } = getChromeMock();
    let fired: string[] = [];
    chromeMock.storage.onChanged.addListener((changes: Record<string, unknown>) => {
      fired = Object.keys(changes);
    });
    await chromeMock.storage.local.set({ settings: { language: 'auto' } });
    const res = await chromeMock.storage.local.get('settings');
    expect(res.settings).toEqual({ language: 'auto' });
    expect(fired).toEqual(['settings']);
  });
});
