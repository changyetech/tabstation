import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider, useT } from './index';

function Probe({ id, params }: { id: string; params?: Record<string, string | number> }) {
  const t = useT();
  return <span data-testid="out">{t(id, params)}</span>;
}

describe('useT', () => {
  it.each([
    [0, '0 вкладок'],
    [1, '1 вкладка'],
    [2, '2 вкладки'],
    [5, '5 вкладок'],
    [11, '11 вкладок'],
    [21, '21 вкладка'],
    [22, '22 вкладки'],
    [25, '25 вкладок'],
  ])('русский：%i 的数量词形', (n, expected) => {
    render(
      <I18nProvider language="ru">
        <Probe id="window.tabCount" params={{ n }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent(expected);
  });

  it.each([
    [0, '0 onglet'],
    [1, '1 onglet'],
    [2, '2 onglets'],
  ])('français：%i 的数量词形', (n, expected) => {
    render(
      <I18nProvider language="fr">
        <Probe id="window.tabCount" params={{ n }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent(expected);
  });

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

  it('复数选择：{k|单数|复数} 按参数值取词', () => {
    render(
      <I18nProvider language="en">
        <Probe id="window.tabCount" params={{ n: 1 }} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('out')).toHaveTextContent('1 tab');
    expect(screen.getByTestId('out')).not.toHaveTextContent('1 tabs');
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
