import type { ReactElement } from 'react';

// 全套 monoline 图标：1.7px 描边、currentColor，路径数据逐字取自设计稿 ICONS
// （refs/design/tab-station-home.html / tab-station-settings.html）

export type IconName =
  | 'logo'
  | 'bookClock'
  | 'bookAdd'
  | 'move'
  | 'close'
  | 'save'
  | 'trash'
  | 'pin'
  | 'chevron'
  | 'restore'
  | 'edit'
  | 'win'
  | 'winNew'
  | 'sparkle'
  | 'check';

const STROKE_PATHS: Record<Exclude<IconName, 'check'>, ReactElement> = {
  logo: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 9h18M8 4v5" />
    </>
  ),
  bookClock: (
    <>
      <path d="M13 3.5H8a2 2 0 0 0-2 2V21l4.5-3 2 1.33" />
      <circle cx="16.5" cy="9" r="4.5" />
      <path d="M16.5 7v2.2l1.6 1" />
    </>
  ),
  bookAdd: (
    <>
      <path d="M17 21l-5-3.5L7 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2Z" />
      <path d="M12 8v5M9.5 10.5h5" />
    </>
  ),
  // 移动到：箭头指向右侧边界线（目标窗口）
  move: (
    <>
      <path d="M3 12h13" />
      <path d="m11 6 6 6-6 6" />
      <path d="M21 5v14" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  save: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  pin: <path d="M12 17v5M5 9l7-6 7 6-2 8H7L5 9Z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  restore: (
    <>
      <path d="M9.5 4H5.5A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21h12a2.5 2.5 0 0 0 2.5-2.5V14.5" />
      <path d="M14 3h7v7M21 3l-8.5 8.5" />
    </>
  ),
  edit: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
  win: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18" />
    </>
  ),
  winNew: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M12 12.5v4M10 14.5h4" />
    </>
  ),
  sparkle: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  ),
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  // check 的描边更粗（设计稿 3.4），单独处理
  const strokeWidth = name === 'check' ? 3.4 : 1.7;
  const body = name === 'check' ? <path d="M4 12.5 9.5 18 20 6" /> : STROKE_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}

// 拖拽手柄是实心圆点阵，不走描边体系，单独导出
export function GripIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="5.5" r="2" />
      <circle cx="15" cy="5.5" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="9" cy="18.5" r="2" />
      <circle cx="15" cy="18.5" r="2" />
    </svg>
  );
}

// favicon 缺失时的回退：域名首字符 + 由 hostname 派生的稳定底色（设计稿字母徽标规则）
export function letterBadgeHue(host: string): number {
  let h = 0;
  for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) % 360;
  return h;
}

export function LetterBadge({ host, className = 'favicon' }: { host: string; className?: string }) {
  const char = (host.replace(/^www\./, '')[0] ?? '?').toUpperCase();
  return (
    <span
      className={className}
      style={{ background: `oklch(45% 0.11 ${letterBadgeHue(host)})` }}
      aria-hidden="true"
    >
      {char}
    </span>
  );
}
