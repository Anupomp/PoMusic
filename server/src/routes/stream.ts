import { Router, Request, Response } from 'express';
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

export default router;
