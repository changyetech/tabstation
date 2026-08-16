import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Icon, GripIcon, LetterBadge, letterBadgeHue } from './icons';

describe('Icon', () => {
  it('默认 1.7px 描边、currentColor、24 viewBox', () => {
    const { container } = render(<Icon name="close" size={13} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '1.7');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '13');
  });
  it('check 用 3.4 粗描边（设计稿特例）', () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '3.4');
  });
  it('grip 是实心填充，不走描边', () => {
    const { container } = render(<GripIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });
});

describe('LetterBadge', () => {
  it('取域名首字符大写，忽略 www 前缀', () => {
    const { container } = render(<LetterBadge host="www.github.com" />);
    expect(container.textContent).toBe('G');
  });
  it('同域名颜色稳定', () => {
    expect(letterBadgeHue('github.com')).toBe(letterBadgeHue('github.com'));
    expect(letterBadgeHue('github.com')).toBeGreaterThanOrEqual(0);
    expect(letterBadgeHue('github.com')).toBeLessThan(360);
  });
});
