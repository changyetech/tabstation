import { useState } from 'react';
import { faviconUrl } from '../lib/favicon';
import { hostnameOf } from '../lib/grouping';
import { LetterBadge } from './icons';

// 站点图标三级回退（spec §5.1）：声明的 favIconUrl →（无声明/加载失败）Chrome 本地 _favicon 缓存 → 字母徽标
export default function Favicon({
  url,
  favIconUrl,
  host,
}: {
  url?: string;
  favIconUrl?: string;
  host?: string;
}) {
  // 记「哪个 URL 失败了」而非布尔位：tab 导航到新站点后 favIconUrl 会换，
  // 布尔位会把新图标一起判死、永久退到 _favicon 回退
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);
  const declaredFailed = favIconUrl !== undefined && favIconUrl === failedUrl;
  const src = favIconUrl && !declaredFailed ? favIconUrl : url ? faviconUrl(url) : undefined;
  if (!src) return <LetterBadge host={host ?? (hostnameOf(url) || '?')} />;
  return <img className="favicon" src={src} alt="" onError={() => setFailedUrl(favIconUrl)} />;
}
