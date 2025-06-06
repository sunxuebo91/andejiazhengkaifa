module.exports = {
  apps: [
    {
      name: 'frontend-prod',
      script: 'npx',
      args: 'serve -s dist -l 8080',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
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