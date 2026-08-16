// 统一经 Chrome 本地 favicon 缓存取站点图标（manifest 需 "favicon" 权限），
// 不向站点发网络请求；未加载/被 discard 的 tab 也能取到图（spec §5.1）
export function faviconUrl(pageUrl: string, size = 32): string {
  const u = new URL(chrome.runtime.getURL('_favicon/'));
  u.searchParams.set('pageUrl', pageUrl);
  u.searchParams.set('size', String(size));
  return u.toString();
}
