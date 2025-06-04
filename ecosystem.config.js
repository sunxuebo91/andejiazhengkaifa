module.exports = {
  apps: [
    {
      name: 'backend',
      script: './backend/dist/main.js',
      cwd: '/home/ubuntu/andejiazhengcrm',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      log_file: './logs/backend-combined.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'frontend',
      script: './node_modules/.bin/vite',
      args: ['preview', '--host', '0.0.0.0', '--port', '4173'],
      cwd: '/home/ubuntu/andejiazhengcrm/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '256M',
      log_file: '/home/ubuntu/andejiazhengcrm/logs/frontend-combined.log',
      out_file: '/home/ubuntu/andejiazhengcrm/logs/frontend-out.log',
      error_file: '/home/ubuntu/andejiazhengcrm/logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '5s'
    },
    {
      name: 'mongodb',
      script: '/usr/bin/mongod',
      args: '--dbpath /home/ubuntu/data/db --logpath /home/ubuntu/data/logs/mongodb.log --bind_ip 0.0.0.0',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 3,
      min_uptime: '30s',
      log_file: '/home/ubuntu/data/logs/mongodb-pm2.log',
      out_file: '/home/ubuntu/data/logs/mongodb-pm2-out.log',
      error_file: '/home/ubuntu/data/logs/mongodb-pm2-error.log'
    }
  ]
}; 