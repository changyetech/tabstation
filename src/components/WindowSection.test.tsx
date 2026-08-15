import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab, makeWindow } from '../test/factories';
import WindowSection from './WindowSection';

const noop = () => undefined;

function renderSection(props: Partial<React.ComponentProps<typeof WindowSection>> = {}) {
  const tabs = [
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
          view="list"
          dupCountByTabId={new Map()}
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
  it('标题 = 窗口 N · 活动 tab 标题 (M 个 tab)', () => {
    renderSection();
    expect(screen.getByRole('heading')).toHaveTextContent('窗口 2 · Active Doc (2 个 tab)');
  });
  it('当前窗口带（当前窗口）标记', () => {
    renderSection({ isCurrent: true });
    expect(screen.getByRole('heading')).toHaveTextContent(
      '窗口 2（当前窗口） · Active Doc (2 个 tab)',
    );
  });
  it('渲染全部行', () => {
    renderSection();
    expect(screen.getByText('Active Doc')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
