import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 高德地图API代理配置
      '/api/amap': {
        target: 'https://restapi.amap.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/amap/, '')
      },
      // 后端API代理
      '/api': {
        target: 'http://localhost:3000', // 后端服务器
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
});
