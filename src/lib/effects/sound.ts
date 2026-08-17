// swoosh 音效：白噪声 buffer + 带通滤波 4000Hz 指数扫到 400Hz，0.25s（移植自 tab-out）

// AudioContext 是重量级资源（Chrome 对同页并发实例有上限），
// 且批量关闭会短时间内连续触发——每次 new + close 既有创建开销也有触碰上限的风险，
// 故按页复用单实例；被浏览器自动挂起时（无用户手势前）恢复即可
let shared: AudioContext | null = null;

function acquireContext(): AudioContext | null {
  if (shared) {
    if (shared.state === 'suspended') void shared.resume();
    return shared;
  }
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null; // Audio 不可用——静默失败（spec §5.10）
  shared = new Ctor();
  return shared;
}

export function playCloseSound(): void {
  try {
    const ctx = acquireContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const duration = 0.25;

    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // 包络：前 10% 快速起音，之后平滑衰减
    for (let i = 0; i < data.length; i++) {
      const pos = i / data.length;
      const env = pos < 0.1 ? pos / 0.1 : Math.pow(1 - (pos - 0.1) / 0.9, 1.5);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.0;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
    // context 长期存活，播完必须自行拆链，否则每次调用都往 destination 上挂一串常驻节点
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio 不可用——静默失败（spec §5.10）
  }
}
