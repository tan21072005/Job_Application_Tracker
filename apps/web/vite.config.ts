import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@jobtrack/contract': fileURLToPath(new URL('../../packages/jobtrack-contract/src/index.ts', import.meta.url))
    }
  },
  server: { proxy: { '/api': { target: 'http://127.0.0.1:64366', changeOrigin: false } } },
  preview: { proxy: { '/api': { target: 'http://127.0.0.1:64366', changeOrigin: false } } },
  build: { emptyOutDir: false }
});
