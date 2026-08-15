import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useT } from './index';

function Probe({ id, params }: { id: string; params?: Record<string, string | number> }) {
  const t = useT();
  return <span data-testid="out">{t(id, params)}</span>;
}

describe('useT', () => {
  it('按语言取文案', () => {
    render(
      <I18nProvider language="zh-CN">
        <Probe id="toolbar.dedupe" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('一键去重');
  });

  it('参数插值', () => {
    render(
      <I18nProvider language="en">
        <Probe id="window.tabCount" params={{ n: 5 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('5 tabs');
  });

  it('缺 key 返回 key 本身', () => {
    render(
      <I18nProvider language="en">
        <Probe id="no.such.key" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('no.such.key');
  });
});
