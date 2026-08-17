import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('main.tsx 挂载', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('#root 不存在时抛出明确错误，而不是静默 return 导致白屏无线索', async () => {
    await expect(import('./main')).rejects.toThrow(/#root/);
  });

  it('#root 存在时正常挂载', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await expect(import('./main')).resolves.toBeDefined();
  });
});
