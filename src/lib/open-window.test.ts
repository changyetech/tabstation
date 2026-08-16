import { describe, expect, it } from 'vitest';
import { getChromeMock } from '../test/chrome-mock';
import { createWindowBySetting } from './open-window';

describe('createWindowBySetting', () => {
  it('max：创建后进入全屏', async () => {
    const { chromeMock } = getChromeMock();
    await createWindowBySetting('max', { url: 'https://a.com/' });
    expect(chromeMock.windows.create).toHaveBeenCalledWith({ url: 'https://a.com/' });
    expect(chromeMock.windows.update).toHaveBeenCalledWith(9002, { state: 'fullscreen' });
  });

  it('same：复制最近聚焦窗口几何并 +40 偏移，不最大化', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.getLastFocused.mockResolvedValue({
      id: 1,
      left: 100,
      top: 50,
      width: 1200,
      height: 800,
    } as chrome.windows.Window);
    await createWindowBySetting('same', { tabId: 42 });
    expect(chromeMock.windows.create).toHaveBeenCalledWith({
      tabId: 42,
      left: 140,
      top: 90,
      width: 1200,
      height: 800,
    });
    expect(chromeMock.windows.update).not.toHaveBeenCalled();
  });

  it('same + sourceWindowId：以指定窗口为几何参照', async () => {
    const { chromeMock } = getChromeMock();
    chromeMock.windows.get.mockResolvedValue({
      id: 7,
      left: 0,
      top: 0,
      width: 900,
      height: 600,
    } as chrome.windows.Window);
    await createWindowBySetting('same', { tabId: 42, sourceWindowId: 7 });
    expect(chromeMock.windows.get).toHaveBeenCalledWith(7);
    expect(chromeMock.windows.create).toHaveBeenCalledWith({
      tabId: 42,
      left: 40,
      top: 40,
      width: 900,
      height: 600,
    });
  });
});
