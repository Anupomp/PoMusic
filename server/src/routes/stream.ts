import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import { redis } from '../redis';
import { getSong, importPlaylist, isValidVideoId } from '../services/ytdlp';
import { searchSongs } from '../services/search';
import { getLyrics } from '../services/lyrics';

const router = Router();

// GET /api/search?q=query — proper text search (youtube-sr + yt-dlp fallback, Redis cached)
router.get('/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    const results = await searchSongs(q, 15);
    return res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/stream?videoId=... — audio stream URL + metadata, Redis cached 1h
router.get('/stream', async (req: Request, res: Response) => {
  const videoId = String(req.query.videoId || req.query.id || '');
  if (!isValidVideoId(videoId)) return res.status(400).json({ error: 'Invalid video ID' });
  try {
    const song = await getSong(videoId);
    return res.json({ url: song.streamUrl, meta: song });
  } catch (err) {
    console.error('Stream error:', err);
    return res.status(500).json({ error: 'Could not get stream' });
  }
});

// GET /api/meta?videoId=... — metadata only (same cache as /stream)
router.get('/meta', async (req: Request, res: Response) => {
  const videoId = String(req.query.videoId || req.query.id || '');
  if (!isValidVideoId(videoId)) return res.status(400).json({ error: 'Invalid video ID' });
  try {
    const { streamUrl, ...meta } = await getSong(videoId);
    return res.json(meta);
  } catch (err) {
    console.error('Meta error:', err);
    return res.status(500).json({ error: 'Could not fetch metadata' });
  }
});

// GET /api/playlist?url=... — import a YouTube playlist or radio/mix
router.get('/playlist', async (req: Request, res: Response) => {
  const url = String(req.query.url || '');
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const results = await importPlaylist(url);
    return res.json(results);
  } catch (err) {
    console.error('Playlist import error:', err);
    return res.status(500).json({ error: 'Could not load playlist' });
  }
});

// GET /api/lyrics?artist=X&track=Y
router.get('/lyrics', async (req: Request, res: Response) => {
  const artist = String(req.query.artist || '');
  const track = String(req.query.track || '');
  if (!artist || !track) return res.status(400).json({ error: 'Missing artist or track' });
  try {
    const result = await getLyrics(artist, track);
    if (!result) return res.status(404).json({ error: 'Lyrics not found' });
    return res.json(result);
  } catch (err) {
    console.error('Lyrics error:', err);
    return res.status(500).json({ error: 'Lyrics fetch failed' });
  }
});

// GET /api/audio?videoId=... — proxy the audio bytes through the server.
// Googlevideo URLs are client- and IP-bound, so browsers get 403 fetching
// them directly; the server fetches and pipes instead. Supports Range
// requests so seeking works.
router.get('/audio', async (req: Request, res: Response) => {
  const videoId = String(req.query.videoId || '');
  if (!isValidVideoId(videoId)) return res.status(400).json({ error: 'Invalid video ID' });

  const headers: Record<string, string> = {};
  if (req.headers.range) headers.Range = String(req.headers.range);

  try {
    let song = await getSong(videoId);
    let upstream = await fetch(song.streamUrl, { headers });

    // Cached URL may be stale/rejected — purge and retry once with a fresh one
    if (upstream.status === 403 || upstream.status === 410) {
      await redis.del(`song:${videoId}`).catch(() => {});
      song = await getSong(videoId);
      upstream = await fetch(song.streamUrl, { headers });
    }
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: `Upstream returned ${upstream.status}` });
    }

    res.status(upstream.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (!upstream.body) return res.end();
    Readable.fromWeb(upstream.body as never).pipe(res);
    return;
  } catch (err) {
    console.error('Audio proxy error:', err);
    if (!res.headersSent) return res.status(500).json({ error: 'Audio proxy failed' });
    return res.end();
  }
});

export default router;
