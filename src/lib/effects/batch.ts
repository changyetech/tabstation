import { animateElementOut, undoAnimateElementOut, EXIT_MS } from './exit';
import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';

export interface CloseEntry {
  tabId: number;
  el: HTMLElement | null;
}

// 批量关闭编排（spec §5.10）：音效一次；纸屑/退场逐行错开 40ms（连环消失）；
// 全部动画结束后统一 tabs.remove
const STAGGER_MS = 40;
// 错开总时长封顶：tabs.remove 要等全部动画结束，40ms × N 在大批量下会让「真正关闭」
// 拖到数秒后（关 50 行 = 2.3s），期间用户看着空白列表却仍能操作已注定关闭的 tab。
// ≤16 行（含设置项最大展示条数）时不触发压缩，时序与现状完全一致
const MAX_STAGGER_TOTAL_MS = 600;

export async function closeTabsWithEffect(entries: CloseEntry[]): Promise<void> {
  if (entries.length === 0) return;
  playCloseSound();
  const stagger =
    entries.length > 1
      ? Math.min(STAGGER_MS, MAX_STAGGER_TOTAL_MS / (entries.length - 1))
      : STAGGER_MS;
  entries.forEach((entry, i) => {
    window.setTimeout(() => {
      if (!entry.el) return;
      const rect = entry.el.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      animateElementOut(entry.el);
    }, i * stagger);
  });
  const total = (entries.length - 1) * stagger + EXIT_MS;
  await new Promise((resolve) => window.setTimeout(resolve, total));
  try {
    await chrome.tabs.remove(entries.map((e) => e.tabId));
  } catch {
    // 动画窗口内 tab 可能已被用户手动关闭，remove 会 reject；
    // 吞掉即可——useTabs 的事件驱动刷新会自愈状态，无需在此处理
    // 但 remove 是整批一次调用，一旦 reject，本批次里仍然开着的 tab
    // 也会永远卡在 .closing（不可见/不可点）——必须摘掉，否则是永久幽灵行
    entries.forEach((e) => e.el && undoAnimateElementOut(e.el));
  }
}
