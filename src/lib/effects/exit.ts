// 元素退场：加 .closing（CSS fade + scale 300ms），动画结束后回调
export const EXIT_MS = 300;

export function animateElementOut(el: HTMLElement, onDone?: () => void): void {
  el.classList.add('closing');
  window.setTimeout(() => onDone?.(), EXIT_MS);
}
