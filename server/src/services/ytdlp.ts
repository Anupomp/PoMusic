import { execFile } from 'child_process';
import { redis } from '../redis';
import { config } from '../config';

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export interface SongMeta {
  id: string;
  title: string;
  channel: string;
  duration: number | null;
  thumb: string;
  streamUrl: string;
  cachedAt: number;
}

export interface FlatEntry {
  id: string;
  title: string;
  channel: string;
  duration: number | null;
  thumb: string;
}

/** Run yt-dlp via execFile — args are passed as an array, never through a shell. */
function ytdlp(args: string[], timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'yt-dlp',
      ['--no-warnings', ...args],
      { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      }
    );
  });
}

export function isValidVideoId(id: string): boolean {
  return VIDEO_ID_RE.test(id);
}

/**
 * Get audio stream URL + metadata for a video.
 * Checks Redis 'song:{videoId}' first (1h TTL); on miss, calls yt-dlp once
 * (-j gives metadata AND format URLs in a single invocation) and caches.
 */
export async function getSong(videoId: string): Promise<SongMeta> {
  if (!isValidVideoId(videoId)) throw new Error('Invalid video ID');

  const cacheKey = `song:${videoId}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    const meta = JSON.parse(cached) as SongMeta;
    // Googlevideo URLs expire ~6h after issue; our 1h TTL keeps us well inside that.
    return meta;
  }

  const out = await ytdlp([
    '-j',
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);
  const data = JSON.parse(out);

  const meta: SongMeta = {
    id: data.id,
    title: data.title,
    channel: data.channel || data.uploader || 'Unknown',
    duration: data.duration ?? null,
    thumb: `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
    streamUrl: data.url,
    cachedAt: Date.now(),
  };

  await redis.set(cacheKey, JSON.stringify(meta), 'EX', config.songCacheTtlSec).catch(() => {});
  return meta;
}

function mapFlat(line: string): FlatEntry | null {
  try {
    const v = JSON.parse(line);
    if (!v?.id) return null;
    return {
      id: v.id,
      title: v.title,
      channel: v.channel || v.uploader || v.playlist_uploader || 'Unknown',
      duration: v.duration ?? null,
      thumb: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

/** yt-dlp text search fallback (slower than youtube-sr but very robust). */
export async function ytdlpSearch(query: string, limit = 15): Promise<FlatEntry[]> {
  const out = await ytdlp(['--dump-json', '--flat-playlist', `ytsearch${limit}:${query}`], 45_000);
  return out.split('\n').map(mapFlat).filter((x): x is FlatEntry => x !== null);
}

/** Import a YouTube playlist or radio/mix URL into a flat track list. */
export async function importPlaylist(url: string): Promise<FlatEntry[]> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }
  const allowedHosts = ['www.youtube.com', 'youtube.com', 'music.youtube.com', 'youtu.be'];
  if (!allowedHosts.includes(parsed.hostname)) throw new Error('Only YouTube URLs are supported');

  const isRadio = url.includes('start_radio=1') || url.includes('list=RD');
  const args = ['--dump-json', '--flat-playlist'];
  if (isRadio) args.push('--playlist-end', '50');
  args.push(url);

  const out = await ytdlp(args, 60_000);
  const results = out.split('\n').map(mapFlat).filter((x): x is FlatEntry => x !== null);
  if (!results.length) throw new Error('No tracks found');
  return results;
}
