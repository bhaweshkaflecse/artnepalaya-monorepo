import http from 'http';
import mongoose from 'mongoose';
import pkg from 'pg';
import { createClient } from 'redis';
import app from './app.js';
import { env } from './config/env.js';
import { initCloudinary } from './config/cloudinary.js';

const { Pool } = pkg;

// Initialize Server
const server = http.createServer(app);

// Initialize PostgreSQL Pool
export const pgPool = new Pool({
  connectionString: env.POSTGRES_URI,
});

// Initialize Redis Client
export const redisClient = createClient({ url: env.REDIS_URL });
redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function startServer() {
  try {
    // 1. Connect MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ MongoDB Connected (Primary)');

    // 2. Connect PostgreSQL
    await pgPool.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected (Logs/Analytics)');

    // 3. Connect Redis
    await redisClient.connect();
    console.log('✅ Redis Connected (Cache/Sessions)');

    // 4. Initialize Cloudinary
    initCloudinary();
    console.log('✅ Cloudinary Initialized');

    // 5. Start HTTP Server
    server.listen(env.PORT, () => {
      console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await mongoose.connection.close();
    await pgPool.end();
    await redisClient.quit();
    console.log('All database connections closed.');
    process.exit(0);
  });
});

startServer();