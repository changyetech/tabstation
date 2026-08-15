import { useT } from '../i18n';
import type { ReadLaterItem } from '../lib/storage';

export interface ReadLaterSidebarProps {
  items: ReadLaterItem[];
  onOpen: (item: ReadLaterItem) => void;
  onDelete: (item: ReadLaterItem, el: HTMLElement | null) => void;
}

// 稍后阅读侧栏（spec §4.3/§5.4）：仅有记录时由 App 渲染；打开即移除；✕ 直接删除
export default function ReadLaterSidebar({ items, onOpen, onDelete }: ReadLaterSidebarProps) {
  const t = useT();
  return (
    <aside className="read-later">
      <h3>📚 {t('readLater.title')}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="read-later-item">
            {item.favIconUrl ? (
              <img className="favicon" src={item.favIconUrl} alt="" />
            ) : (
              <span className="favicon favicon-placeholder" />
            )}
            <button className="read-later-title" onClick={() => onOpen(item)}>
              {item.title}
            </button>
            <button
              className="read-later-delete"
              title={t('readLater.delete')}
              onClick={(e) => onDelete(item, e.currentTarget.closest('li'))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
