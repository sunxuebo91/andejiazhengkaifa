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
        rewrite: (path) => path.replace(/^\\/api\\\\/amap/, '')
      },
      // OCR API直连代理
      '/api/ocr': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\\/api\\\\/ocr/, '/api/ocr')
      },
      // OCR测试服务器直连代理
      '/ocr-server': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false
      },
      // OCR测试路径直连
      '/ocr-test': {
        target: 'http://localhost:3002/test',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => ''
      },
      // 后端API代理
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
