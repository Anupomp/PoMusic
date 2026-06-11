import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgres://pomusic:pomusic@localhost:5432/pomusic',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '7d',
  songCacheTtlSec: 60 * 60,        // 1 hour for song metadata + stream URL
  searchCacheTtlSec: 10 * 60,      // 10 minutes for search results
  roomTtlSec: 12 * 60 * 60,        // listen-together rooms expire after 12h idle
};
