import { hostnameOf } from '../lib/grouping';
import Favicon from './Favicon';

// 拖影（spec 2026-08-16-session-card-dnd §3.4）：DragOverlay 内的浮动行摘要，
// by windows 与会话两处 DndContext 共用；无标题（加载中 / chrome 页）退回域名
export default function DragGhost({
  title,
  url,
  favIconUrl,
}: {
  title?: string;
  url?: string;
  favIconUrl?: string;
}) {
  return (
    <div className="drag-ghost">
      <Favicon url={url} favIconUrl={favIconUrl} />
      <span className="tab-title">{title || hostnameOf(url)}</span>
    </div>
  );
}
