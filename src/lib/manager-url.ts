// 管理页路径唯一定义处；dist 内相对路径与源码路径一致
export const MANAGER_PATH = 'src/manager/index.html';

export function managerUrl(): string {
  return chrome.runtime.getURL(MANAGER_PATH);
}
