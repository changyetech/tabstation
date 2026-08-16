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
  const [declaredFailed, setDeclaredFailed] = useState(false);
  const src = favIconUrl && !declaredFailed ? favIconUrl : url ? faviconUrl(url) : undefined;
  if (!src) return <LetterBadge host={host ?? (hostnameOf(url) || '?')} />;
  return <img className="favicon" src={src} alt="" onError={() => setDeclaredFailed(true)} />;
}
