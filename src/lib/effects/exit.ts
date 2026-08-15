// 元素退场：加 .closing（CSS fade + scale 300ms），动画结束后回调
export const EXIT_MS = 300;

export function animateElementOut(el: HTMLElement, onDone?: () => void): void {
  el.classList.add('closing');
  window.setTimeout(() => onDone?.(), EXIT_MS);
}

// 退场失败回滚：底层 remove 整体 reject 时，元素其实并未真正关闭，
// 需摘掉 .closing 恢复可见/可点，否则该行/该区块会永久隐形（幽灵行）
export function undoAnimateElementOut(el: HTMLElement): void {
  el.classList.remove('closing');
}
