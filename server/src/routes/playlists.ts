import { Router, Response } from 'express';
import { pool } from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/playlists — list user's playlists with song counts
router.get('/', async (req: AuthedRequest, res: Response) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.created_at, COUNT(ps.id)::int AS song_count
     FROM playlists p
     LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
     WHERE p.user_id = $1
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

// POST /api/playlists — create
router.post('/', async (req: AuthedRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Playlist name required' });
  const result = await pool.query(
    'INSERT INTO playlists (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
    [req.userId, name]
  );
  return res.status(201).json({ ...result.rows[0], song_count: 0 });
});

// GET /api/playlists/:id — playlist with songs
router.get('/:id', async (req: AuthedRequest, res: Response) => {
  const pl = await pool.query('SELECT id, name FROM playlists WHERE id = $1 AND user_id = $2', [
    req.params.id, req.userId,
  ]);
  if (!pl.rows.length) return res.status(404).json({ error: 'Playlist not found' });
  const songs = await pool.query(
    `SELECT id, video_id, title, thumbnail_url, duration_sec, position
     FROM playlist_songs WHERE playlist_id = $1 ORDER BY position ASC, id ASC`,
    [req.params.id]
  );
  return res.json({ ...pl.rows[0], songs: songs.rows });
});

// PATCH /api/playlists/:id — rename
router.patch('/:id', async (req: AuthedRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Playlist name required' });
  const result = await pool.query(
    'UPDATE playlists SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name',
    [name, req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Playlist not found' });
  return res.json(result.rows[0]);
});

// DELETE /api/playlists/:id
router.delete('/:id', async (req: AuthedRequest, res: Response) => {
  const result = await pool.query(
    'DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Playlist not found' });
  return res.status(204).end();
});

// POST /api/playlists/:id/songs — add a song (appends to end)
router.post('/:id/songs', async (req: AuthedRequest, res: Response) => {
  const { video_id, title, thumbnail_url, duration_sec } = req.body ?? {};
  if (!video_id || !title) return res.status(400).json({ error: 'video_id and title required' });

  const pl = await pool.query('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [
    req.params.id, req.userId,
  ]);
  if (!pl.rows.length) return res.status(404).json({ error: 'Playlist not found' });

  const result = await pool.query(
    `INSERT INTO playlist_songs (playlist_id, video_id, title, thumbnail_url, duration_sec, position)
     VALUES ($1, $2, $3, $4, $5,
       (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_songs WHERE playlist_id = $1))
     RETURNING *`,
    [req.params.id, video_id, title, thumbnail_url ?? null, duration_sec ?? null]
  );
  return res.status(201).json(result.rows[0]);
});

// DELETE /api/playlists/:id/songs/:songId
router.delete('/:id/songs/:songId', async (req: AuthedRequest, res: Response) => {
  const result = await pool.query(
    `DELETE FROM playlist_songs ps USING playlists p
     WHERE ps.id = $1 AND ps.playlist_id = p.id AND p.id = $2 AND p.user_id = $3
     RETURNING ps.id`,
    [req.params.songId, req.params.id, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Song not found' });
  return res.status(204).end();
});

export default router;
