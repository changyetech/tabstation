import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DragGhost from './DragGhost';

describe('DragGhost', () => {
  it('渲染标题', () => {
    render(<DragGhost title="Example Page" url="https://example.com/a" />);
    expect(screen.getByText('Example Page')).toBeInTheDocument();
  });
  it('无标题回退域名（加载中 / chrome 页）', () => {
    render(<DragGhost url="https://example.com/a" />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });
});
