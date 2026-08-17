import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { MANAGER_PATH } from './src/lib/manager-url.ts';

// 版本单一来源：package.json 的 version 注入产物 manifest
// public/manifest.json 不带 version 字段，只有构建产物才是完整 manifest
function manifestVersion(): Plugin {
  return {
    name: 'tabstation:manifest-version',
    enforce: 'post',
    closeBundle() {
      const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
      const manifestPath = 'dist/manifest.json';
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  plugins: [react(), manifestVersion()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        manager: MANAGER_PATH,
        settings: 'src/settings/index.html',
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
