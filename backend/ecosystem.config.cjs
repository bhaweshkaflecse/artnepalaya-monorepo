module.exports = {
  apps: [
    {
      name: 'artnepalaya-api',
      script: './src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      error_file: '/dev/null',
      out_file: '/dev/null',
      log_file: '/dev/null',
    },
  ],
};
