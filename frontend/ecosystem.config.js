export default {
  apps: [
    {
      name: 'frontend-prod',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 4173 --host 0.0.0.0',
      cwd: '/home/ubuntu/andejiazhengcrm/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '../logs/frontend-prod-error.log',
      out_file: '../logs/frontend-prod-out.log',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    }
  ]
};