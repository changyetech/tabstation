import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import Toolbar from './Toolbar';

function renderToolbar(over: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props = {
    mode: 'window' as const,
    onMode: vi.fn(),
    dedupeCloseCount: 0,
    onDedupe: vi.fn(),
    onDedupeHover: vi.fn(),
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
  it('切换模式；无视图段控（spec §3.1 2026-08-16 修订）', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByText('全部模式'));
    expect(props.onMode).toHaveBeenCalledWith('all');
    expect(screen.queryByText('列表视图')).not.toBeInTheDocument();
    expect(screen.queryByText('域名视图')).not.toBeInTheDocument();
  });

  it('段序：全部模式 → 窗口模式 → 已保存会话（default-view spec）', () => {
    renderToolbar();
    const labels = [...document.querySelectorAll('.seg-group .seg')].map((el) => el.textContent);
    expect(labels).toEqual(['全部模式', '窗口模式', '已保存会话']);
  });

  it('三段按钮各含一枚图标（toolbar-seg-icons spec）', () => {
    renderToolbar();
    for (const label of ['窗口模式', '全部模式', '已保存会话']) {
      const btn = screen.getByText(label).closest('button');
      expect(btn?.querySelector('svg')).toBeInTheDocument();
    }
  });

  it('第三段「已保存会话」→ onMode(sessions)（spec §3.1 2026-08-16 修订）', async () => {
    const props = renderToolbar();
    await userEvent.click(screen.getByText('已保存会话'));
    expect(props.onMode).toHaveBeenCalledWith('sessions');
  });

  it('会话模式下有重复也不渲染去重按钮（spec §5.4）', () => {
    renderToolbar({ mode: 'sessions', dedupeCloseCount: 3 });
    expect(screen.queryByText(/一键去重/)).not.toBeInTheDocument();
  });

  it('无重复时不渲染去重按钮（spec §5.4）', () => {
    renderToolbar({ dedupeCloseCount: 0 });
    expect(screen.queryByText(/一键去重/)).not.toBeInTheDocument();
  });

  it('有重复时按钮带待关数 −N；hover 与点击回调', async () => {
    const props = renderToolbar({ dedupeCloseCount: 3 });
    const btn = screen.getByText(/一键去重/).closest('button');
    if (!btn) throw new Error('去重按钮未找到');
    expect(btn).toHaveTextContent('−3');
    await userEvent.hover(btn);
    expect(props.onDedupeHover).toHaveBeenCalledWith(true);
    await userEvent.click(btn);
    expect(props.onDedupe).toHaveBeenCalled();
    await userEvent.unhover(btn);
    expect(props.onDedupeHover).toHaveBeenCalledWith(false);
  });
});
