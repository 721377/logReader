// mohamed configuration for the pm2 

module.exports = {
  apps: [{
    name: 'log-manager',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    // Auto-restart settings
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // Logging
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart strategies
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};