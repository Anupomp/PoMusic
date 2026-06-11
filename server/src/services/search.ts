import YouTube from 'youtube-sr';
import { redis } from '../redis';
import { config } from '../config';
import { FlatEntry, ytdlpSearch } from './ytdlp';

/**
 * Proper text search — the v1 pain point.
 *
 * Strategy:
 *   1. Redis cache 'search:{query}' (10 min TTL) — repeated searches are instant.
 *   2. youtube-sr — scrapes YouTube's results page, no API key, ~300-800ms.
 *   3. yt-dlp ytsearch fallback — slow (5-10s) but survives YouTube layout changes.
 */
export async function searchSongs(query: string, limit = 15): Promise<FlatEntry[]> {
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  let results: FlatEntry[] = [];

  try {
    const videos = await YouTube.search(query, { limit, type: 'video' });
    results = videos
      .filter((v) => v.id)
      .map((v) => ({
        id: v.id as string,
        title: v.title || 'Untitled',
        channel: v.channel?.name || 'Unknown',
        duration: v.duration ? Math.round(v.duration / 1000) : null,
        thumb: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      }));
  } catch (err) {
    console.warn('youtube-sr search failed, falling back to yt-dlp:', (err as Error).message);
  }

  if (!results.length) {
    results = await ytdlpSearch(query, limit);
  }

  if (results.length) {
    await redis
      .set(cacheKey, JSON.stringify(results), 'EX', config.searchCacheTtlSec)
      .catch(() => {});
  }
  return results;
}
