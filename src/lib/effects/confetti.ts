// 纸屑：17 个粒子从 (x,y) 迸发，随机角度 + 上抛偏置 + 重力，700–900ms（移植自 tab-out）
// 色板取设计稿 CONFETTI_COLORS（品牌五色）
const COLORS = [
  'oklch(58% 0.18 255)',
  'oklch(62% 0.15 155)',
  'oklch(65% 0.16 55)',
  'oklch(60% 0.17 25)',
  'oklch(58% 0.16 300)',
];

const PARTICLES_PER_BURST = 17;
// 活跃粒子上限：批量关闭会连续爆发（关 50 行 = 850 个元素），
// 超过上限的粒子不再入场，避免 DOM/合成开销把关闭动效本身拖卡
const MAX_ACTIVE = 400;

interface Particle {
  el: HTMLElement;
  vx: number;
  vy: number;
  duration: number; // 秒
  spin: number; // 每秒旋转角度，圆形粒子为 0
  startTime: number;
}

// 单条共享 rAF 驱动全部粒子：每粒子各起一条循环时，浏览器每帧要跑上百个回调
const particles: Particle[] = [];
let rafId = 0;

const GRAVITY = 200;

function tick(now: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const elapsed = (now - p.startTime) / 1000;
    const progress = elapsed / p.duration;
    if (progress >= 1) {
      p.el.remove();
      particles.splice(i, 1);
      continue;
    }
    const px = p.vx * elapsed;
    const py = p.vy * elapsed + 0.5 * GRAVITY * elapsed * elapsed;
    p.el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${elapsed * p.spin}deg)`;
    p.el.style.opacity = String(progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2);
  }
  rafId = particles.length > 0 ? requestAnimationFrame(tick) : 0;
}

export function shootConfetti(x: number, y: number): void {
  // 无障碍：系统开启「减弱动态效果」时不发射（CSS 侧已在 tokens.css 处理过渡动画，
  // JS 驱动的粒子不受其约束，需在此显式尊重该偏好）
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const budget = Math.min(PARTICLES_PER_BURST, MAX_ACTIVE - particles.length);
  if (budget <= 0) return;

  // 一次爆发的元素合批插入，避免 17 次独立的 DOM 变更
  const fragment = document.createDocumentFragment();
  const startTime = performance.now();
  for (let i = 0; i < budget; i++) {
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
    fragment.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    particles.push({
      el,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80, // 上抛偏置
      duration: (700 + Math.random() * 200) / 1000,
      spin: isCircle ? 0 : 200,
      startTime,
    });
  }
  document.body.appendChild(fragment);

  if (rafId === 0) rafId = requestAnimationFrame(tick);
}
