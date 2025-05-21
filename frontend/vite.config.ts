import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 后端API代理
      '/api': {
        target: 'http://localhost:3000', // 修改为使用端口3000
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
});
