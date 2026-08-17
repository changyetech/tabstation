import { createWindowBySetting } from './open-window';
import type { SavedSession, Settings } from './storage';

// 恢复：新窗口按当前顺序全量打开并还原 pinned；会话保留（模板式）；尺寸遵循设置
export async function restoreSession(
  session: SavedSession,
  mode: Settings['newWindowMode'],
): Promise<void> {
  const win = await createWindowBySetting(mode, {
    url: session.tabs.map((x) => x.url),
    focused: true,
  });
  const created = win?.tabs ?? [];
  await Promise.all(
    session.tabs.map((st, i) => {
      const id = created[i]?.id;
      if (!st.pinned || id === undefined) return Promise.resolve();
      return chrome.tabs.update(id, { pinned: true });
    }),
  );
}
