import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Favicon from './Favicon';

describe('Favicon', () => {
  it('优先使用声明的 favIconUrl', () => {
    const { container } = render(
      <Favicon url="https://a.com/p" favIconUrl="https://a.com/icon.png" />,
    );
    expect(container.querySelector('img.favicon')?.getAttribute('src')).toBe(
      'https://a.com/icon.png',
    );
  });

  it('favIconUrl 加载失败 → 回退 Chrome 本地 _favicon 缓存', () => {
    const { container } = render(
      <Favicon url="https://a.com/p" favIconUrl="https://a.com/icon.png" />,
    );
    const img = container.querySelector('img.favicon');
    if (!img) throw new Error('favicon img 未渲染');
    fireEvent.error(img);
    expect(container.querySelector('img.favicon')?.getAttribute('src')).toBe(
      'chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fa.com%2Fp&size=32',
    );
  });

  it('tab 换站点（favIconUrl 变化）→ 重新尝试新声明的图标，不被旧失败判死', () => {
    const { container, rerender } = render(
      <Favicon url="https://a.com/p" favIconUrl="https://a.com/icon.png" />,
    );
    const img = container.querySelector('img.favicon');
    if (!img) throw new Error('favicon img 未渲染');
    fireEvent.error(img);
    rerender(<Favicon url="https://c.com/p" favIconUrl="https://c.com/icon.png" />);
    expect(container.querySelector('img.favicon')?.getAttribute('src')).toBe(
      'https://c.com/icon.png',
    );
  });

  it('无 favIconUrl → 直接走 _favicon', () => {
    const { container } = render(<Favicon url="https://b.com/" />);
    expect(container.querySelector('img.favicon')?.getAttribute('src')).toBe(
      'chrome-extension://test-id/_favicon/?pageUrl=https%3A%2F%2Fb.com%2F&size=32',
    );
  });

  it('URL 也缺失 → 字母徽标', () => {
    const { container } = render(<Favicon host="x.com" />);
    expect(container.querySelector('span.favicon')?.textContent).toBe('X');
  });
});
