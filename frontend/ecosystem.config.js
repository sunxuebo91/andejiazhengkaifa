export default {
  apps: [
    {
      name: 'frontend-prod',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 4173 --host',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/frontend-prod-error.log',
      out_file: 'logs/frontend-prod-out.log',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}; 