import { useT } from '../i18n';
import type { SavedSession, SessionTab } from '../lib/storage';

export interface SessionSectionProps {
  sessions: SavedSession[];
  onRestore: (s: SavedSession) => void;
  onDelete: (s: SavedSession) => void;
  onRename: (s: SavedSession, name: string) => void;
  onReorderTab: (s: SavedSession, from: number, to: number) => void;
  onDeleteTab: (s: SavedSession, index: number) => void;
  onOpenTab: (tab: SessionTab) => void;
}

// 已保存会话分区（spec §4.3/§5.5）：可折叠；模板式，恢复不消耗
export default function SessionSection({ sessions, onRestore, onDelete }: SessionSectionProps) {
  const t = useT();
  if (sessions.length === 0) return null;
  return (
    <details open className="session-section">
      <summary>💾 {t('sessions.title')}</summary>
      <ul className="session-list">
        {sessions.map((s) => (
          <li key={s.id} className="session-row">
            <span className="session-name">{s.name}</span>
            <span className="session-count">({t('window.tabCount', { n: s.tabs.length })})</span>
            <button onClick={() => onRestore(s)}>{t('sessions.open')}</button>
            <button onClick={() => onDelete(s)}>{t('sessions.delete')}</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
