import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n';
import { makeTab } from '../test/factories';
import DomainGroupList from './DomainGroupList';

const noop = () => undefined;

describe('DomainGroupList', () => {
  it('按域名聚合、tab 数降序、特殊组文案', () => {
    const tabs = [
      makeTab({ id: 1, url: 'https://b.com/1', title: 'B1' }),
      makeTab({ id: 2, url: 'https://a.com/1', title: 'A1' }),
      makeTab({ id: 3, url: 'https://a.com/2', title: 'A2' }),
      makeTab({ id: 4, url: 'file:///x.pdf', title: 'F1' }),
    ];
    render(
      <I18nProvider language="zh-CN">
        <DndContext>
          <DomainGroupList
            tabs={tabs}
            now={Date.now()}
            dupCountByTabId={new Map()}
            previewByTabId={new Map()}
            registerRow={noop}
            onCloseTab={noop}
          />
        </DndContext>
      </I18nProvider>,
    );
    const summaries = screen
      .getAllByRole('group')
      .map((d) => d.querySelector('summary')?.textContent);
    expect(summaries[0]).toContain('a.com');
    expect(summaries).toEqual(expect.arrayContaining([expect.stringContaining('本地文件')]));
    expect(screen.getByText('A1')).toBeInTheDocument();
  });
});
