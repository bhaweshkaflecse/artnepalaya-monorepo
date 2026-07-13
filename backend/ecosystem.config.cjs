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
    },
  ],
};
