import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 假设后端运行在3001端口
        changeOrigin: true,
        secure: false,
      }
    }
  }
}) 