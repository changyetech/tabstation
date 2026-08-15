import { useT } from '../i18n';

export type Mode = 'window' | 'all';
export type View = 'list' | 'domain';

export interface ToolbarProps {
  mode: Mode;
  view: View;
  onMode: (m: Mode) => void;
  onView: (v: View) => void;
  onDedupe: () => void;
  onDedupeHover: (hovering: boolean) => void;
  onSettings: () => void;
}

export default function Toolbar({
  mode,
  view,
  onMode,
  onView,
  onDedupe,
  onDedupeHover,
  onSettings,
}: ToolbarProps) {
  const t = useT();
  const seg = (active: boolean) => `seg${active ? ' seg-active' : ''}`;
  return (
    <div className="toolbar">
      <div className="seg-group">
        <button className={seg(mode === 'window')} onClick={() => onMode('window')}>
          {t('toolbar.modeWindow')}
        </button>
        <button className={seg(mode === 'all')} onClick={() => onMode('all')}>
          {t('toolbar.modeAll')}
        </button>
      </div>
      <div className="seg-group">
        <button className={seg(view === 'list')} onClick={() => onView('list')}>
          {t('toolbar.viewList')}
        </button>
        <button className={seg(view === 'domain')} onClick={() => onView('domain')}>
          {t('toolbar.viewDomain')}
        </button>
      </div>
      <span className="toolbar-spacer" />
      {/* 一键去重（spec §5.6）：hover 预览、点击无确认直接执行 */}
      <button
        onMouseEnter={() => onDedupeHover(true)}
        onMouseLeave={() => onDedupeHover(false)}
        onClick={onDedupe}
      >
        {t('toolbar.dedupe')}
      </button>
      {/* 历史直达入口（spec §5.8）：无内嵌面板、无 history 权限 */}
      <button onClick={() => void chrome.tabs.create({ url: 'chrome://history' })}>
        🕘 {t('toolbar.history')}
      </button>
      <button onClick={onSettings}>⚙ {t('toolbar.settings')}</button>
    </div>
  );
}
