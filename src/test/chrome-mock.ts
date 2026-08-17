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
      openOptionsPage: vi.fn(async () => {}),
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
          // 通过全局 chrome（而非闭包变量 onChanged）派发：installChromeMock 每次都会
          // 重建这个闭包，但 onChanged 这个 MockEvent 实例本身跨测试保留（见 graft 注释），
          // 经由全局取才能保证总是派发到当前真正被监听的那一个实例上；
          // 全局 chrome 的类型来自真实 @types/chrome（无 emit），故转到 mock 类型
          (
            globalThis as unknown as { chrome: ReturnType<typeof buildChromeMock> }
          ).chrome.storage.onChanged.emit(changes, 'local');
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
      onReplaced: new MockEvent(),
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
    omnibox: {
      setDefaultSuggestion: vi.fn(),
      onInputStarted: new MockEvent<() => void>(),
      onInputChanged: new MockEvent<
        (text: string, suggest: (suggestions: chrome.omnibox.SuggestResult[]) => void) => void
      >(),
      onInputEntered: new MockEvent<
        (text: string, disposition: `${chrome.omnibox.OnInputEnteredDisposition}`) => void
      >(),
      onInputCancelled: new MockEvent<() => void>(),
    },
  };
}

let current: ChromeMockHandle | undefined;
let persistent: ReturnType<typeof buildChromeMock> | undefined;

// background.ts 这类模块在 import 时于顶层调用一次 addListener，绑定的是当时的
// MockEvent 实例；若每次 installChromeMock 都整体换掉 globalThis.chrome，
// 这些监听器就会绑定在被丢弃的旧实例上，之后测试里的 .emit(...) 永远打不到它们。
// 因此这里把 MockEvent 叶子节点原地保留（复用同一实例），只把普通 vi.fn() 方法换成新的——
// 组件类监听器（hooks 里 addListener/removeListener）靠 afterEach(cleanup) 卸载即可清理，无需依赖整体替换。
//
// 隐含约定：MockEvent 实例现在跨同一测试文件内的用例持续存在。凡是在 it() 内直接调用
// addListener（不经由 React 组件的 useEffect）的测试，必须自己在用例结束前 removeListener，
// 否则监听器会永久泄漏进同文件后续的用例。
function graft(target: Record<string, unknown>, fresh: Record<string, unknown>): void {
  for (const key of Object.keys(fresh)) {
    const freshVal = fresh[key];
    if (freshVal instanceof MockEvent) continue;
    const curVal = target[key];
    if (
      freshVal !== null &&
      typeof freshVal === 'object' &&
      !Array.isArray(freshVal) &&
      curVal !== null &&
      typeof curVal === 'object'
    ) {
      graft(curVal as Record<string, unknown>, freshVal as Record<string, unknown>);
    } else {
      target[key] = freshVal;
    }
  }
}

export function installChromeMock(): ChromeMockHandle {
  const storageData: Record<string, unknown> = {};
  const fresh = buildChromeMock(storageData);
  if (!persistent) {
    persistent = fresh;
    (globalThis as Record<string, unknown>).chrome = persistent;
  } else {
    graft(
      persistent as unknown as Record<string, unknown>,
      fresh as unknown as Record<string, unknown>,
    );
  }
  current = { chromeMock: persistent, storageData };
  return current;
}

export function getChromeMock(): ChromeMockHandle {
  if (!current) throw new Error('chrome mock 未安装（setup.ts 应已处理）');
  return current;
}
