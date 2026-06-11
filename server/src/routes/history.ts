import { Router, Response } from 'express';
import { pool } from '../db';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/history?limit=50 — most recent plays
router.get('/', async (req: AuthedRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
  const result = await pool.query(
    `SELECT id, video_id, title, played_at
     FROM listening_history
     WHERE user_id = $1
     ORDER BY played_at DESC
     LIMIT $2`,
    [req.userId, limit]
  );
  res.json(result.rows);
});

// POST /api/history — record a play
router.post('/', async (req: AuthedRequest, res: Response) => {
  const { video_id, title } = req.body ?? {};
  if (!video_id || !title) return res.status(400).json({ error: 'video_id and title required' });
  const result = await pool.query(
    'INSERT INTO listening_history (user_id, video_id, title) VALUES ($1, $2, $3) RETURNING *',
    [req.userId, video_id, title]
  );
  return res.status(201).json(result.rows[0]);
});

export default router;
