import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  it('message 为 null 时不渲染', () => {
    const { container } = render(<Toast message={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('有 message 时显示', () => {
    render(<Toast message="没有可保存的 tab" />);
    expect(screen.getByText('没有可保存的 tab')).toBeInTheDocument();
  });
});
