import type { ReactElement } from 'react';

// 全套 monoline 图标：1.7px 描边、currentColor
// 20 视窗族取自 design/tab-station-design-system.html「图标」区块，
// 其余 24 视窗路径取自设计稿 ICONS（refs/design/tab-station-home.html / tab-station-settings.html）

export type IconName =
  | 'logo'
  | 'bookClock'
  | 'bookAdd'
  | 'move'
  | 'close'
  | 'save'
  | 'trash'
  | 'pin'
  | 'restore'
  | 'edit'
  | 'win'
  | 'winNew'
  | 'globe'
  | 'session'
  | 'sparkle'
  | 'check';

// 品牌 mark：带 favicon 圆孔的标签落在站台杆上（⊥ / T 双关），路径取自 design/brand-spec.md
// 实心填充、128 网格，不走描边体系；≤16px 用去孔简化版（规范唯一允许的图形改动）
const LOGO_MARK_PATH =
  'M57 32h14a10 10 0 0 1 10 10v42h15a6 6 0 0 1 0 12H32a6 6 0 0 1 0-12h15V42a10 10 0 0 1 10-10Zm7 13a7 7 0 1 0 0 14 7 7 0 1 0 0-14Z';
const LOGO_MARK_PATH_16 =
  'M55 28h18a10 10 0 0 1 10 10v40h13a8 8 0 0 1 0 16H32a8 8 0 0 1 0-16h13V38a10 10 0 0 1 10-10Z';

// 20 视窗图标族：路径逐字取自 design/tab-station-design-system.html「图标」区块
const STROKE_PATHS_20: Partial<Record<IconName, ReactElement>> = {
  // 窗口模式：窗口框 + 工具条线 + 标签分隔
  win: (
    <>
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
      <path d="M2.5 7.5h15M6 3.5v4" />
    </>
  ),
  // 全部模式：地球（全浏览器范围）
  globe: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M3.4 8h13.2M3.4 12h13.2M10 3a11 11 0 0 1 0 14M10 3a11 11 0 0 0 0 14" />
    </>
  ),
  // 会话：快照层叠
  session: (
    <>
      <rect x="3.5" y="6.5" width="13" height="10" rx="2" />
      <path d="M6.5 6.5v-2a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v7" />
    </>
  ),
  // 拆到新窗口：左窗 + 右侧新窗 + 箭头
  winNew: (
    <>
      <rect x="2.5" y="4.5" width="8" height="11" rx="1.5" />
      <path d="M13.5 4.5h4v11h-4M12 10h5.5M15 7.5l2.5 2.5-2.5 2.5" />
    </>
  ),
  // 移动到：左右窗口括弧 + 中线
  move: (
    <path d="M7 4.5h-2a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 5 15.5h2M13 4.5h2a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-2M10 2.5v15" />
  ),
};

const STROKE_PATHS: Record<
  Exclude<IconName, 'check' | 'logo' | 'win' | 'winNew' | 'globe' | 'session' | 'move'>,
  ReactElement
> = {
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
  close: <path d="M6 6l12 12M18 6 6 18" />,
  save: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  pin: <path d="M12 17v5M5 9l7-6 7 6-2 8H7L5 9Z" />,
  restore: (
    <>
      <path d="M9.5 4H5.5A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21h12a2.5 2.5 0 0 0 2.5-2.5V14.5" />
      <path d="M14 3h7v7M21 3l-8.5 8.5" />
    </>
  ),
  edit: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
  sparkle: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  ),
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  if (name === 'logo') {
    return (
      <svg width={size} height={size} viewBox="0 0 128 128" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d={size <= 16 ? LOGO_MARK_PATH_16 : LOGO_MARK_PATH} />
      </svg>
    );
  }
  // check 的描边更粗（设计稿 3.4），单独处理
  const strokeWidth = name === 'check' ? 3.4 : 1.7;
  const path20 = STROKE_PATHS_20[name];
  const body =
    name === 'check' ? (
      <path d="M4 12.5 9.5 18 20 6" />
    ) : (
      (path20 ?? STROKE_PATHS[name as keyof typeof STROKE_PATHS])
    );
  return (
    <svg
      width={size}
      height={size}
      viewBox={path20 ? '0 0 20 20' : '0 0 24 24'}
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
