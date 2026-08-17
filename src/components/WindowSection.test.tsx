import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab, makeWindow } from '../test/factories';
import WindowSection from './WindowSection';

const noop = () => undefined;

function renderSection(
  props: Partial<React.ComponentProps<typeof WindowSection>> = {},
  tabsOverride?: ReturnType<typeof makeTab>[],
) {
  const tabs = tabsOverride ?? [
    makeTab({ id: 1, title: 'Active Doc', active: true, index: 0 }),
    makeTab({ id: 2, title: 'Other', index: 1 }),
  ];
  return render(
    <I18nProvider language="zh-CN">
      <DndContext>
        <WindowSection
          window={makeWindow({ id: 1 })}
          windowNumber={2}
          tabs={tabs}
          isCurrent={false}
          draggable={false}
          dupCountByTabId={new Map()}
          previewByTabId={new Map()}
          dedupePreview={false}
          visibleLimit={8}
          expandedKeys={new Set<string>()}
          onToggleExpand={noop}
          now={Date.now()}
          registerRow={noop}
          onCloseTab={noop}
          {...props}
        />
      </DndContext>
    </I18nProvider>,
  );
}

describe('WindowSection', () => {
  it('区块头：窗口 N + 标签页计数', () => {
    renderSection();
    expect(screen.getByText('窗口 2')).toBeInTheDocument();
    expect(screen.getByText(/2 个标签页/)).toBeInTheDocument();
  });
  it('当前窗口带「当前」胶囊与强调描边', () => {
    renderSection({ isCurrent: true });
    expect(screen.getByText('当前')).toBeInTheDocument();
    expect(document.querySelector('.win-block')).toHaveClass('is-current');
  });
  it('渲染全部行', () => {
    renderSection();
    expect(screen.getByText('Active Doc')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
  it('固定数出现在 meta（N 固定）', () => {
    renderSection({}, [
      makeTab({ id: 1, title: 'P', pinned: true, index: 0 }),
      makeTab({ id: 2, title: 'Q', index: 1 }),
    ]);
    expect(screen.getByText(/1 固定/)).toBeInTheDocument();
  });
});

describe('WindowSection 折叠', () => {
  const manyTabs = Array.from({ length: 10 }, (_, i) =>
    makeTab({ id: i + 1, title: `T${i + 1}`, index: i }),
  );
  it('超出展示条数：截断并出现「还有 N 个 · 展开」', async () => {
    const onToggleExpand = vi.fn();
    renderSection({ onToggleExpand }, manyTabs);
    expect(screen.getByText('T8')).toBeInTheDocument();
    expect(screen.queryByText('T9')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText(/还有 2 个标签页/));
    expect(onToggleExpand).toHaveBeenCalledWith('w1');
  });
  it('展开态全量显示并提供「收起」', () => {
    renderSection({ expandedKeys: new Set(['w1']) }, manyTabs);
    expect(screen.getByText('T10')).toBeInTheDocument();
    expect(screen.getByText('收起')).toBeInTheDocument();
  });
  it('visibleLimit = all 永不折叠', () => {
    renderSection({ visibleLimit: 'all' }, manyTabs);
    expect(screen.getByText('T10')).toBeInTheDocument();
    expect(screen.queryByText(/展开/)).not.toBeInTheDocument();
  });
  // spec 2026-08-17-dup-fold-exemption
  it('折叠区里的重复行照常渲染，more 计数排除它', () => {
    renderSection({ dupCountByTabId: new Map([[10, 2]]) }, manyTabs);
    expect(screen.getByText('T10')).toBeInTheDocument();
    expect(screen.queryByText('T9')).not.toBeInTheDocument();
    expect(screen.getByText(/还有 1 个标签页/)).toBeInTheDocument();
  });
});

describe('WindowSection 关闭窗口', () => {
  it('点击直接回调，无确认（设计稿语义）', async () => {
    const onCloseWindow = vi.fn();
    renderSection({ onCloseWindow });
    await userEvent.click(screen.getByTitle('关闭窗口'));
    expect(onCloseWindow).toHaveBeenCalled();
  });

  it('未传 onCloseWindow 时不渲染按钮', () => {
    renderSection();
    expect(screen.queryByTitle('关闭窗口')).not.toBeInTheDocument();
  });
});
