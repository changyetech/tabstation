import { useT } from '../i18n';
import { Icon } from './icons';

export type Mode = 'window' | 'all' | 'sessions';

export interface ToolbarProps {
  mode: Mode;
  onMode: (m: Mode) => void;
  /** 去重待关数；0 = 无重复，按钮不渲染（设计稿规则） */
  dedupeCloseCount: number;
  onDedupe: () => void;
  onDedupeHover: (hovering: boolean) => void;
}

// 控制条（设计稿 control-bar）：吸顶毛玻璃，模式居左，去重 CTA 居右
export default function Toolbar({
  mode,
  onMode,
  dedupeCloseCount,
  onDedupe,
  onDedupeHover,
}: ToolbarProps) {
  const t = useT();
  return (
    <div className="control-wrap">
      <div className="control-bar">
        <div className="seg-group" role="group">
          <button className="seg" aria-pressed={mode === 'window'} onClick={() => onMode('window')}>
            <Icon name="win" size={13} />
            {t('toolbar.modeWindow')}
          </button>
          <button className="seg" aria-pressed={mode === 'all'} onClick={() => onMode('all')}>
            <Icon name="globe" size={13} />
            {t('toolbar.modeAll')}
          </button>
          <button
            className="seg"
            aria-pressed={mode === 'sessions'}
            onClick={() => onMode('sessions')}
          >
            <Icon name="session" size={13} />
            {t('toolbar.modeSessions')}
          </button>
        </div>
        <span className="control-spacer" />
        {/* 一键去重（spec §5.4）：仅有重复时出现；会话模式下不渲染；hover 预览、点击无确认执行 */}
        {mode !== 'sessions' && dedupeCloseCount > 0 && (
          <button
            className="btn-dedupe"
            onMouseEnter={() => onDedupeHover(true)}
            onMouseLeave={() => onDedupeHover(false)}
            onClick={onDedupe}
          >
            <Icon name="sparkle" size={13} />
            {t('toolbar.dedupe')}
            <span className="count num">−{dedupeCloseCount}</span>
          </button>
        )}
      </div>
    </div>
  );
}
