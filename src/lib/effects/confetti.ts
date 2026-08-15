// 纸屑：17 个粒子从 (x,y) 迸发，随机角度 + 上抛偏置 + 重力，700–900ms（移植自 tab-out）
const COLORS = [
  '#c8713a',
  '#e8a070',
  '#5a7a62',
  '#8aaa92',
  '#5a6b7a',
  '#8a9baa',
  '#d4b896',
  '#b35a5a',
];

export function shootConfetti(x: number, y: number): void {
  const particleCount = 17;
  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    el.dataset.confetti = '';
    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6; // 5–11px
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px; background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none; z-index: 9999;
      transform: translate(-50%, -50%); opacity: 1;
    `;
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 80; // 上抛偏置
    const gravity = 200;
    const startTime = performance.now();
    const duration = 700 + Math.random() * 200;

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);
      if (progress >= 1) {
        el.remove();
        return;
      }
      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${elapsed * 200 * (isCircle ? 0 : 1)}deg)`;
      el.style.opacity = String(progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
