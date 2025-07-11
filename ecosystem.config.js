module.exports = {
  apps: [
    // 后端生产环境
    {
      name: 'backend-prod',
      cwd: './backend',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      error_file: '../logs/backend-prod-error.log',
      out_file: '../logs/backend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      env_file: '.env'
    },
    // 后端开发环境
    {
      name: 'backend-dev',
      cwd: './backend',
      script: 'dist/main.js',
      watch: ['dist'],
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      error_file: '../logs/backend-dev-error.log',
      out_file: '../logs/backend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true,
      env_file: '.env.dev'
    },
    // 前端生产环境 - 使用serve静态部署
    {
      name: 'frontend-prod',
      cwd: './frontend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      error_file: '../logs/frontend-prod-error.log',
      out_file: '../logs/frontend-prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    },
    // 前端开发环境 - 使用Vite开发服务器
    {
      name: 'frontend-dev',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev -- --port 5174 --host',
      env: {
        NODE_ENV: 'development',
        PORT: 5174,
        VITE_API_BASE_URL: 'http://localhost:3000/api'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      error_file: '../logs/frontend-dev-error.log',
      out_file: '../logs/frontend-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      time: true
    }
  ]
}; 