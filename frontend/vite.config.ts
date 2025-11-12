import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // 性能优化配置
    target: 'es2015',
    minify: 'esbuild', // 使用 esbuild 压缩，速度更快
    rollupOptions: {
      output: {
        // 手动分包，优化加载速度
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design 组件库
          'antd-vendor': ['antd', '@ant-design/icons'],
          // ZEGO 视频 SDK（最大的包，单独分离）
          'zego-vendor': ['@zegocloud/zego-uikit-prebuilt'],
          // 其他工具库
          'utils-vendor': ['axios', 'dayjs'],
        },
      },
    },
    // 启用 gzip 压缩
    reportCompressedSize: true,
    // 增加 chunk 大小警告限制（因为 ZEGO SDK 很大）
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0', // 允许外部访问
    proxy: {
      // 后端API代理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0', // 允许外部访问
    allowedHosts: true,
    proxy: {
      // 后端API代理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
