// 扩展自身全部页面的 URL 唯一定义处；dist 内相对路径与源码路径一致
export const MANAGER_PATH = 'src/manager/index.html';
export const NEWTAB_PATH = 'src/newtab/index.html';

export function managerUrl(): string {
  return chrome.runtime.getURL(MANAGER_PATH);
}

// 自有页面前缀（管理页 + 设置页 + 新标签页等）；用于「本扩展页面隐身」判定
export function ownPagePrefix(): string {
  return chrome.runtime.getURL('');
}
