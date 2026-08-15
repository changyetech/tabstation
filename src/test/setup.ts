import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { installChromeMock } from './chrome-mock';

// 模块级安装：测试文件的静态 import 在任何 beforeEach 之前求值，
// background.ts 这类模块顶层就注册 chrome 监听器的文件依赖此时 chrome 已存在
installChromeMock();

beforeEach(() => {
  // 每个用例重置为干净的 mock
  installChromeMock();
});

// jsdom 默认 navigator.language 为 en-US；App 级测试断言中文文案，钉死为 zh-CN
Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
