module.exports = {
  apps: [{
    name: 'oadro-radio',
    script: 'npm',
    args: 'start',
    cwd: '/home/ubuntu',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true,
    exec_mode: 'fork'
  }]
};