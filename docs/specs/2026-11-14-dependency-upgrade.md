# 依赖稳定版升级

将 `package.json` 的 dependencies 和 devDependencies 升级到 npm registry 当前稳定版本，同步 pnpm 锁文件，不改变扩展业务行为。

- React 与 React DOM 升级到 19，并同步类型定义。React 19 的 `RefObject` 不再隐式包含 `null`，工具栏搜索框引用需显式声明可空。
- TypeScript 7 提供 `tsc`；按官方并行安装方案，将 `@typescript/native` 指向 `typescript`，将 `typescript` 指向 `@typescript/typescript6`，为尚不支持 TS 7 API 的 typescript-eslint 提供兼容 API。
- 保留已有版本范围风格和包管理器版本。
- Vitest 5 默认清空 mock 调用记录；音效测试需在每个用例内独立初始化模块缓存，保留单实例复用与挂起恢复断言。
- 验收：`make check`、`pnpm build`、`pnpm peers check`，并确认直接依赖无待升级稳定版本。

参考：[React 19 升级指南](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)、[TypeScript 并行安装方案](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)。
