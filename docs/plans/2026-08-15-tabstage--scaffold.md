# tabstage 子计划：脚手架（--scaffold）

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可构建、可测试的项目骨架：Vite 双入口产出可加载的 MV3 扩展，Vitest + chrome mock 测试 harness 就绪。

**Architecture:** `public/` 存放 Vite 原样拷贝的 manifest.json 与 `_locales/`（spec 结构图中根目录的 manifest.json 在实现上落位于 `public/`，构建后位于 `dist/` 根——Chrome 加载的是 `dist/`）。manager 页面走 HTML 入口，background 走独立 entry 产出 `dist/background.js`（ES module service worker）。

**Tech Stack:** pnpm, Vite, React 18, TypeScript strict, Vitest, jsdom, Testing Library。

**Depends on:** 无。

## Global Constraints

- permissions 仅 `["tabs", "storage"]`；语言标签 `zh-CN`（`_locales/zh_CN/`）
- 禁用 crxjs 等扩展框架；注释用简体中文
- `MANAGER_PATH = 'src/manager/index.html'` 唯一定义于 `src/lib/manager-url.ts`

---

### Task 1: pnpm 项目初始化 + TypeScript 配置

**Files:**
- Create: `package.json`, `tsconfig.json`
- Modify: `.gitignore`（确保含 `node_modules/`、`dist/`）

**Interfaces:**
- Produces: `pnpm build` / `pnpm test` 脚本约定，全部后续任务使用

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "tabstage",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite build --watch",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: 安装依赖（不锁具体版本，取当前最新）**

```bash
pnpm add react react-dom @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add -D typescript vite @vitejs/plugin-react vitest jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/react @types/react-dom @types/chrome
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["chrome", "vite/client"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 检查 .gitignore 已含 `node_modules/` 与 `dist/`，缺则追加**

- [ ] **Step 5: 验证**

Run: `pnpm tsc --noEmit`
Expected: 无输出（src 尚为空，编译通过）

- [ ] **Step 6: Commit**

```bash
rtk git add package.json pnpm-lock.yaml tsconfig.json .gitignore
rtk git commit -m "chore: pnpm + TypeScript 项目初始化"
```

---

### Task 2: Vite 双入口 + manifest + _locales + 入口桩

**Files:**
- Create: `vite.config.ts`, `public/manifest.json`, `public/_locales/en/messages.json`, `public/_locales/zh_CN/messages.json`, `src/manager/index.html`, `src/manager/main.tsx`, `src/manager/App.tsx`, `src/manager/styles.css`, `src/background.ts`, `src/lib/manager-url.ts`

**Interfaces:**
- Produces: `MANAGER_PATH: string` 与 `managerUrl(): string`（`src/lib/manager-url.ts`）；`App` 默认导出（--ui-list 重写）；`dist/background.js`（--background 填充逻辑）

- [ ] **Step 1: 创建 vite.config.ts（含 Vitest 配置）**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        manager: 'src/manager/index.html',
        background: 'src/background.ts',
      },
      output: {
        // background 必须是稳定文件名，manifest 引用它
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
```

- [ ] **Step 2: 创建 public/manifest.json**

```json
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "version": "0.1.0",
  "default_locale": "en",
  "permissions": ["tabs", "storage"],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_title": "__MSG_extName__" },
  "commands": {
    "open-manager": {
      "suggested_key": { "default": "Ctrl+Shift+E", "mac": "Command+Shift+E" },
      "description": "__MSG_cmdOpenManager__"
    }
  }
}
```

- [ ] **Step 3: 创建 _locales**

`public/_locales/en/messages.json`：

```json
{
  "extName": { "message": "tabstage" },
  "extDescription": { "message": "Centralized tab manager: sort, move, dedupe, read later, and window sessions. 100% local." },
  "cmdOpenManager": { "message": "Open tab manager" }
}
```

`public/_locales/zh_CN/messages.json`：

```json
{
  "extName": { "message": "tabstage" },
  "extDescription": { "message": "集中式 TAB 管理：排序、移动、去重、稍后阅读与窗口会话。100% 本地运行。" },
  "cmdOpenManager": { "message": "打开 TAB 管理页" }
}
```

- [ ] **Step 4: 创建 manager 入口桩**

`src/lib/manager-url.ts`：

```ts
// 管理页路径唯一定义处；dist 内相对路径与源码路径一致
export const MANAGER_PATH = 'src/manager/index.html';

export function managerUrl(): string {
  return chrome.runtime.getURL(MANAGER_PATH);
}
```

`src/manager/index.html`：

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>tabstage</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/manager/main.tsx`：

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);
```

`src/manager/App.tsx`（桩，--ui-list 重写）：

```tsx
export default function App() {
  return <h1>tabstage</h1>;
}
```

`src/manager/styles.css`（基础样式，--ui-list 扩充）：

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #222; }
```

`src/background.ts`（桩，--background 填充）：

```ts
// 单例逻辑见 --background 子计划
export {};
```

- [ ] **Step 5: 构建并验证 dist 结构**

Run: `pnpm build && rtk ls dist`
Expected: `dist/manifest.json`、`dist/_locales/en/messages.json`、`dist/_locales/zh_CN/messages.json`、`dist/background.js`、`dist/src/manager/index.html`、`dist/assets/` 均存在

- [ ] **Step 6: 手动冒烟（一次性）**

Chrome 打开 `chrome://extensions` → 开发者模式 → 「加载已解压的扩展程序」选择 `dist/` → 扩展出现且无 manifest 报错。

- [ ] **Step 7: Commit**

```bash
rtk git add vite.config.ts public src
rtk git commit -m "feat: Vite 双入口脚手架 + MV3 manifest + _locales"
```

---

### Task 3: 测试 harness（chrome mock + 工厂 + 冒烟测试）+ Makefile

**Files:**
- Create: `src/test/chrome-mock.ts`, `src/test/setup.ts`, `src/test/factories.ts`, `src/manager/App.test.tsx`
- Modify: `Makefile`（仅填充 install/dev/build/test/clean 五个目标的 TODO，lint/fmt 不动）

**Interfaces:**
- Produces:
  - `installChromeMock(): ChromeMockHandle` / `getChromeMock(): ChromeMockHandle`（每个测试用例自动重装）
  - `MockEvent<F>`：`addListener/removeListener/emit`
  - `makeTab(partial): chrome.tabs.Tab`、`makeWindow(partial): chrome.windows.Window`
  - 全部后续测试任务依赖本 harness

- [ ] **Step 1: 写冒烟测试（先失败）**

`src/manager/App.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { getChromeMock } from '../test/chrome-mock';

describe('测试 harness 冒烟', () => {
  it('App 渲染标题', () => {
    render(<App />);
    expect(screen.getByText('tabstage')).toBeInTheDocument();
  });

  it('chrome mock：storage 读写往返且触发 onChanged', async () => {
    const { chromeMock } = getChromeMock();
    let fired: string[] = [];
    chromeMock.storage.onChanged.addListener((changes: Record<string, unknown>) => {
      fired = Object.keys(changes);
    });
    await chromeMock.storage.local.set({ settings: { language: 'auto' } });
    const res = await chromeMock.storage.local.get('settings');
    expect(res.settings).toEqual({ language: 'auto' });
    expect(fired).toEqual(['settings']);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: FAIL（`src/test/setup.ts` 不存在 / `getChromeMock` 未定义）

- [ ] **Step 3: 实现 chrome mock**

`src/test/chrome-mock.ts`：

```ts
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
  const onChanged = new MockEvent<(changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, area: string) => void>();
  return {
    runtime: {
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
    },
    storage: {
      local: {
        get: vi.fn(async (key?: string) =>
          key === undefined ? { ...storageData } : { [key]: storageData[key] }
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
    commands: { onCommand: new MockEvent() },
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
```

`src/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { installChromeMock } from './chrome-mock';

beforeEach(() => {
  installChromeMock();
});
```

`src/test/factories.ts`：

```ts
// 测试数据工厂：只填必要字段，其余给默认值
let nextId = 1;

export function makeTab(partial: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: partial.id ?? nextId++,
    index: 0,
    windowId: 1,
    url: 'https://example.com/',
    title: 'Example',
    pinned: false,
    active: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    frozen: false,
    ...partial,
  } as chrome.tabs.Tab;
}

export function makeWindow(partial: Partial<chrome.windows.Window> = {}): chrome.windows.Window {
  return {
    id: partial.id ?? 1,
    focused: false,
    incognito: false,
    alwaysOnTop: false,
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
    ...partial,
  } as chrome.windows.Window;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm vitest run src/manager/App.test.tsx`
Expected: PASS（2 个用例）

- [ ] **Step 5: 填充 Makefile 五个 TODO（lint/fmt 保持原样不动）**

```makefile
install: ## Install dependencies
	pnpm install

dev: ## Start dev server
	pnpm dev

build: ## Build for production
	pnpm build

test: ## Run tests
	pnpm test

clean: ## Remove build artifacts and generated files
	rm -rf dist
```

- [ ] **Step 6: 验证**

Run: `make test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
rtk git add src/test src/manager/App.test.tsx Makefile
rtk git commit -m "test: chrome mock 测试 harness + Makefile 填充"
```
