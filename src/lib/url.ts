// URL 归一化：去掉 hash（# 及之后），其余保持原样。
// 全项目唯一实现——去重（dedupe.ts）与稍后阅读判重（storage.ts）共用。
export function normalizeUrl(url: string): string {
  const i = url.indexOf('#');
  return i === -1 ? url : url.slice(0, i);
}
