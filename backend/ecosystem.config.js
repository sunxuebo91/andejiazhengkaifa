module.exports = {
  apps: [
    {
      name: 'backend-dev',
      script: 'dist/main.js',
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/backend-dev-error.log',
      out_file: 'logs/backend-dev-out.log',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env'
    },
    {
      name: 'backend-prod',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '300M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/backend-prod-error.log',
      out_file: 'logs/backend-prod-out.log',
      merge_logs: true,
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env'
    }
  ]
}; 