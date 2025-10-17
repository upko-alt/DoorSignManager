module.exports = {
  apps: [{
    name: 'epaper-dashboard',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Restart on file changes (optional, useful during initial deployment)
    // watch: ['server'],
    // Ignore these directories when watching
    ignore_watch: [
      'node_modules',
      'client',
      'logs',
      '.git'
    ],
    // Environment-specific configuration
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your_server_ip',  // Replace with your Droplet IP
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/yourrepo.git',  // Replace with your repo
      path: '/home/deploy/epaper-dashboard',
      'post-deploy': 'npm install && npm run build && npm run db:push && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
