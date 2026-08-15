// swoosh 音效：白噪声 buffer + 带通滤波 4000Hz 指数扫到 400Hz，0.25s（移植自 tab-out）
export function playCloseSound(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return; // Audio 不可用——静默失败（spec §5.10）
    const ctx = new Ctor();
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
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // Audio 不可用——静默失败（spec §5.10）
  }
}
