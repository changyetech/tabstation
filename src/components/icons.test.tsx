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
  it('logo 是实心品牌 mark、128 网格；>16px 带 favicon 孔', () => {
    const { container } = render(<Icon name="logo" size={22} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(svg).toHaveAttribute('viewBox', '0 0 128 128');
    expect(svg).not.toHaveAttribute('stroke');
    expect(container.querySelector('path')?.getAttribute('d')).toContain('a7 7');
  });
  it('logo ≤16px 用去孔简化版', () => {
    const { container } = render(<Icon name="logo" size={15} />);
    expect(container.querySelector('path')?.getAttribute('d')).not.toContain('a7 7');
  });
  it('20 视窗图标族（设计系统稿「图标」区块）：1.7 描边、20 viewBox', () => {
    for (const name of ['win', 'winNew', 'move', 'globe', 'session'] as const) {
      const { container } = render(<Icon name={name} size={13} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '1.7');
      expect(svg).toHaveAttribute('viewBox', '0 0 20 20');
      expect(svg?.childElementCount).toBeGreaterThan(0);
    }
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
