import { animateElementOut, EXIT_MS } from './exit';
import { playCloseSound } from './sound';
import { shootConfetti } from './confetti';

export interface CloseEntry {
  tabId: number;
  el: HTMLElement | null;
}

// 批量关闭编排（spec §5.10）：音效一次；纸屑/退场逐行错开 40ms（连环消失）；
// 全部动画结束后统一 tabs.remove
const STAGGER_MS = 40;

export async function closeTabsWithEffect(entries: CloseEntry[]): Promise<void> {
  if (entries.length === 0) return;
  playCloseSound();
  entries.forEach((entry, i) => {
    window.setTimeout(() => {
      if (!entry.el) return;
      const rect = entry.el.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      animateElementOut(entry.el);
    }, i * STAGGER_MS);
  });
  const total = (entries.length - 1) * STAGGER_MS + EXIT_MS;
  await new Promise((resolve) => window.setTimeout(resolve, total));
  try {
    await chrome.tabs.remove(entries.map((e) => e.tabId));
  } catch {
    // 动画窗口内 tab 可能已被用户手动关闭，remove 会 reject；
    // 吞掉即可——useTabs 的事件驱动刷新会自愈状态，无需在此处理
  }
}
