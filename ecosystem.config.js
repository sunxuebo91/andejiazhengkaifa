module.exports = {
  apps: [
    // 后端生产环境
    {
      name: 'backend-prod',
      cwd: './backend',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ESIGN_HOST: 'https://oapi.asign.cn'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '../logs/backend-prod-error.log',
      out_file: '../logs/backend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      env_file: '.env',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    },
    // 后端开发环境
    {
      name: 'backend-dev',
      cwd: './backend',
      script: 'dist/main.js',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        ESIGN_HOST: 'https://oapi.asign.cn'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '../logs/backend-dev-error.log',
      out_file: '../logs/backend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      env_file: '.env',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    },
    // 前端生产环境 - 使用Vite preview
    {
      name: 'frontend-prod',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 4173 --host 0.0.0.0',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '../logs/frontend-prod-error.log',
      out_file: '../logs/frontend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    },
    // 前端开发环境 - 使用Vite开发服务器
    {
      name: 'frontend-dev',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev -- --port 5173 --host 0.0.0.0',
      env: {
        NODE_ENV: 'development',
        PORT: 5173,
        VITE_API_BASE_URL: 'http://localhost:3001/api'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      error_file: '../logs/frontend-dev-error.log',
      out_file: '../logs/frontend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    }
  ]
};