import { describe, expect, it, vi } from 'vitest';
import { playCloseSound } from './sound';

// 最小 AudioContext 替身：只提供 playCloseSound 用到的节点与方法
const construct = vi.fn();
const resume = vi.fn(async () => {});
let contextState: AudioContextState = 'running';

function node() {
  return {
    type: '',
    buffer: null as AudioBuffer | null,
    onended: null as (() => void) | null,
    Q: { value: 0 },
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn((target: unknown) => target),
    disconnect: vi.fn(),
    start: vi.fn(),
  };
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  resume = resume;
  constructor() {
    construct();
  }
  get state() {
    return contextState;
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return node();
  }
  createBiquadFilter() {
    return node();
  }
  createGain() {
    return node();
  }
}

Object.defineProperty(window, 'AudioContext', {
  value: FakeAudioContext as unknown as typeof AudioContext,
  configurable: true,
  writable: true,
});

describe('playCloseSound', () => {
  it('连续播放复用同一个 AudioContext（不每次新建 / 关闭）', () => {
    playCloseSound();
    playCloseSound();
    playCloseSound();
    expect(construct).toHaveBeenCalledTimes(1);
  });

  it('context 被浏览器挂起时先 resume 再播', () => {
    contextState = 'suspended';
    resume.mockClear();
    playCloseSound();
    expect(resume).toHaveBeenCalled();
    expect(construct).toHaveBeenCalledTimes(1); // 仍是同一个实例
    contextState = 'running';
  });
});
