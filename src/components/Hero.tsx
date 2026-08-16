import { useEffect, useState } from 'react';
import { useLanguage, useT } from '../i18n';

export interface HeroStats {
  windows: number;
  tabs: number;
  domains: number;
  dupGroups: number;
  readLater: number;
}

// 时段问候：按小时五档（设计稿 tickGreet）
function greetKey(hour: number): string {
  if (hour < 6) return 'hero.greetNight';
  if (hour < 12) return 'hero.greetMorning';
  if (hour < 14) return 'hero.greetNoon';
  if (hour < 18) return 'hero.greetAfternoon';
  return 'hero.greetEvening';
}

export default function Hero({ stats }: { stats: HeroStats }) {
  const t = useT();
  const lang = useLanguage();
  // 每分钟刷新问候与日期
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const dateText = new Intl.DateTimeFormat(lang, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now);

  const items: [number, string][] = [
    [stats.windows, t('stats.windows')],
    [stats.tabs, t('stats.tabs')],
    [stats.domains, t('stats.domains')],
    [stats.dupGroups, t('stats.dupGroups')],
    [stats.readLater, t('stats.readLater')],
  ];

  return (
    <header className="hero">
      <div className="hero-main">
        <div>
          <div className="hero-greet">{t(greetKey(now.getHours()))}</div>
          <div className="hero-date num">{dateText}</div>
        </div>
        <div className="stats num">
          {items.map(([n, label]) => (
            <div className="stat" key={label}>
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
