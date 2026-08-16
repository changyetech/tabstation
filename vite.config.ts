import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { MANAGER_PATH } from './src/lib/manager-url.ts';

export default defineConfig({
  plugins: [react()],
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
