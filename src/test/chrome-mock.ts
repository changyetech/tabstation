import { vi } from 'vitest';

// 极简 chrome event 模拟：addListener/removeListener/emit
export class MockEvent<F extends (...args: never[]) => void> {
  private listeners = new Set<F>();
  addListener = (f: F) => void this.listeners.add(f);
  removeListener = (f: F) => void this.listeners.delete(f);
  hasListener = (f: F) => this.listeners.has(f);
  emit = (...args: Parameters<F>) => this.listeners.forEach((f) => f(...args));
}

export interface ChromeMockHandle {
  chromeMock: ReturnType<typeof buildChromeMock>;
  storageData: Record<string, unknown>;
}

function buildChromeMock(storageData: Record<string, unknown>) {
  const onChanged = new MockEvent<
    (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void
  >();
  return {
    runtime: {
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
      getManifest: () => ({ version: '0.1.0' }) as chrome.runtime.Manifest,
    },
    storage: {
      local: {
        get: vi.fn(async (key?: string) =>
          key === undefined ? { ...storageData } : { [key]: storageData[key] },
        ),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, { newValue: unknown }> = {};
          for (const [k, v] of Object.entries(items)) {
            storageData[k] = v;
            changes[k] = { newValue: v };
          }
          onChanged.emit(changes, 'local');
        }),
      },
      onChanged,
    },
    tabs: {
      query: vi.fn(async () => [] as chrome.tabs.Tab[]),
      get: vi.fn(),
      create: vi.fn(async (props: object) => ({ id: 9001, ...props })),
      update: vi.fn(async () => undefined),
      move: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      onCreated: new MockEvent(),
      onRemoved: new MockEvent(),
      onUpdated: new MockEvent(),
      onMoved: new MockEvent(),
      onActivated: new MockEvent(),
      onAttached: new MockEvent(),
      onDetached: new MockEvent(),
    },
    windows: {
      getAll: vi.fn(async () => [] as chrome.windows.Window[]),
      get: vi.fn(),
      getCurrent: vi.fn(async () => ({ id: 1 }) as chrome.windows.Window),
      getLastFocused: vi.fn(async () => ({ id: 1 }) as chrome.windows.Window),
      create: vi.fn(async (props: object) => ({ id: 9002, tabs: [], ...props })),
      update: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      onCreated: new MockEvent(),
      onRemoved: new MockEvent(),
      onFocusChanged: new MockEvent(),
    },
    action: { onClicked: new MockEvent() },
    commands: {
      onCommand: new MockEvent(),
      getAll: vi.fn(async () => [
        { name: 'open-manager', shortcut: '⌘⇧E', description: 'Open manager' },
      ]),
    },
  };
}

let current: ChromeMockHandle | undefined;

export function installChromeMock(): ChromeMockHandle {
  const storageData: Record<string, unknown> = {};
  const chromeMock = buildChromeMock(storageData);
  (globalThis as Record<string, unknown>).chrome = chromeMock;
  current = { chromeMock, storageData };
  return current;
}

export function getChromeMock(): ChromeMockHandle {
  if (!current) throw new Error('chrome mock 未安装（setup.ts 应已处理）');
  return current;
}
