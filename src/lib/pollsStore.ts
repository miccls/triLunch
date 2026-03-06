import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis | undefined };

export const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL || '');

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export const POLL_EXPIRY = 60 * 60 * 24; // 24 hours in seconds
