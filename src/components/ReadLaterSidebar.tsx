import TooltipButton from './TooltipButton';
import { useLanguage, useT } from '../i18n';
import type { ReadLaterItem } from '../lib/storage';
import { formatRelative, lastAccessedDisplay } from '../lib/time';
import Favicon from './Favicon';
import { Icon } from './icons';

export interface ReadLaterSidebarProps {
  items: ReadLaterItem[];
  now: number;
  onOpen: (item: ReadLaterItem) => void;
  onOpenNewWindow: (item: ReadLaterItem) => void;
  onOpenAll: () => void;
  onDelete: (item: ReadLaterItem, el: HTMLElement | null) => void;
}

// 稍后阅读面板（spec §5.5）：空时整卡隐藏；打开即从清单移除
export default function ReadLaterSidebar({
  items,
  now,
  onOpen,
  onOpenNewWindow,
  onOpenAll,
  onDelete,
}: ReadLaterSidebarProps) {
  const t = useT();
  const lang = useLanguage();
  if (items.length === 0) return null;
  const timeText = (savedAt: number) => {
    const display = lastAccessedDisplay(savedAt, now);
    return display.kind === 'relative'
      ? formatRelative(lang, display.value, display.unit)
      : t('time.justNow');
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="icon">
          <Icon name="bookClock" size={15} />
        </span>
        <span className="panel-title">{t('readLater.title')}</span>
        <span className="panel-count num">{t('readLater.count', { n: items.length })}</span>
        <TooltipButton
          className="panel-act"
          title={t('readLater.openAllTitle')}
          onClick={onOpenAll}
        >
          <Icon name="restore" size={13} />
          {t('readLater.openAll')}
        </TooltipButton>
      </div>
      <ul className="rl-list">
        {items.map((item) => (
          <li key={item.id} className="rl-row" onClick={() => onOpen(item)}>
            <Favicon url={item.url} favIconUrl={item.favIconUrl} />
            <span className="rl-text">
              <TooltipButton
                className="rl-title"
                aria-label={item.title}
                title={t('readLater.openTitle')}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(item);
                }}
              >
                {item.title}
              </TooltipButton>
              <span className="rl-url">{item.url.replace(/^https?:\/\//, '')}</span>
            </span>
            <span className="row-tail">
              <span className="rl-time num">{timeText(item.savedAt)}</span>
              <span className="rl-acts">
                <TooltipButton
                  className="icon-btn"
                  title={t('readLater.newWindow')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNewWindow(item);
                  }}
                >
                  <Icon name="winNew" size={13} />
                </TooltipButton>
                <TooltipButton
                  className="icon-btn danger"
                  title={t('readLater.delete')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item, e.currentTarget.closest('li'));
                  }}
                >
                  <Icon name="close" size={13} />
                </TooltipButton>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
