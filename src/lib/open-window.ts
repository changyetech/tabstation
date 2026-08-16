import type { Settings } from './storage';

export interface NewWindowOpts {
  /** 把既有 tab 挪进新窗口（拆窗）；与 url 互斥 */
  tabId?: number;
  /** 在新窗口打开的 URL（稍后阅读 / 会话恢复 / 新建空窗口时省略） */
  url?: string | string[];
  focused?: boolean;
  /** same 模式的几何参照窗口；缺省用最近聚焦窗口 */
  sourceWindowId?: number;
}

// 一切「在新窗口打开」类动作的统一出口，尺寸遵循设置（spec §5.3）
export async function createWindowBySetting(
  mode: Settings['newWindowMode'],
  opts: NewWindowOpts = {},
): Promise<chrome.windows.Window | undefined> {
  const { sourceWindowId, ...createOpts } = opts;
  if (mode === 'same') {
    const src =
      sourceWindowId !== undefined
        ? await chrome.windows.get(sourceWindowId)
        : await chrome.windows.getLastFocused();
    // +40 偏移避免与源窗口完全重叠（沿用旧移动菜单的做法）
    return chrome.windows.create({
      ...createOpts,
      left: (src.left ?? 0) + 40,
      top: (src.top ?? 0) + 40,
      width: src.width,
      height: src.height,
    });
  }
  const win = await chrome.windows.create(createOpts);
  if (win?.id !== undefined) await chrome.windows.update(win.id, { state: 'fullscreen' });
  return win;
}
