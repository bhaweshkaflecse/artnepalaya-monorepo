import { redisClient } from '../../server.js';

export const getOrSetCache = async (key, ttl, fetchCallback) => {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) return JSON.parse(cachedData);

    const freshData = await fetchCallback();
    if (freshData !== null && freshData !== undefined) {
      await redisClient.setEx(key, ttl, JSON.stringify(freshData));
    }
    return freshData;
  } catch (err) {
    console.error(`[Redis Error] key: ${key}`, err);
    return await fetchCallback(); // Fallback to DB
  }
};

export const invalidateCache = async (key) => {
  try { await redisClient.del(key); } 
  catch (err) { console.error(`[Redis Error] del key: ${key}`, err); }
};