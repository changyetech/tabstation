import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { getChromeMock } from '../test/chrome-mock';

describe('测试 harness 冒烟', () => {
  it('App 渲染标题', () => {
    render(<App />);
    expect(screen.getByText('tabstage')).toBeInTheDocument();
  });

  it('chrome mock：storage 读写往返且触发 onChanged', async () => {
    const { chromeMock } = getChromeMock();
    let fired: string[] = [];
    chromeMock.storage.onChanged.addListener((changes: Record<string, unknown>) => {
      fired = Object.keys(changes);
    });
    await chromeMock.storage.local.set({ settings: { language: 'auto' } });
    const res = await chromeMock.storage.local.get('settings');
    expect(res.settings).toEqual({ language: 'auto' });
    expect(fired).toEqual(['settings']);
  });
});
