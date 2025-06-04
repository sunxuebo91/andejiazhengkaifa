module.exports = {
  apps: [
    {
      name: 'backend-prod',
      script: './backend/dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      error_file: './logs/backend-prod-error.log',
      out_file: './logs/backend-prod-out.log',
      time: true
    },
    {
      name: 'frontend-prod',
      script: 'npx',
      args: 'serve -s dist -l 8080',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      error_file: './logs/frontend-prod-error.log',
      out_file: './logs/frontend-prod-out.log',
      time: true
    }
  ]
}; 