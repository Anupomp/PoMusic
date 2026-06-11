import { Router, Response } from 'express';
import { redis } from '../redis';
import { config } from '../config';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();

// Unambiguous alphabet — no 0/O or 1/I/L
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export interface RoomState {
  code: string;
  hostUserId: number;
  queue: unknown[];
  currentIndex: number;
  playing: boolean;
  position: number;
  updatedAt: number;
}

export const roomKey = (code: string) => `room:${code.toUpperCase()}`;

// POST /api/rooms/create — generate a 6-char code, store room state in Redis
router.post('/create', requireAuth, async (req: AuthedRequest, res: Response) => {
  let code = generateCode();
  // Regenerate on the (rare) collision
  for (let i = 0; i < 5 && (await redis.exists(roomKey(code))); i++) code = generateCode();

  const state: RoomState = {
    code,
    hostUserId: req.userId!,
    queue: Array.isArray(req.body?.queue) ? req.body.queue : [],
    currentIndex: typeof req.body?.currentIndex === 'number' ? req.body.currentIndex : 0,
    playing: false,
    position: 0,
    updatedAt: Date.now(),
  };

  await redis.set(roomKey(code), JSON.stringify(state), 'EX', config.roomTtlSec);
  return res.status(201).json({ code });
});

// GET /api/rooms/:code — fetch room state (used when joining)
router.get('/:code', async (req, res: Response) => {
  const raw = await redis.get(roomKey(String(req.params.code)));
  if (!raw) return res.status(404).json({ error: 'Room not found or expired' });
  return res.json(JSON.parse(raw));
});

export default router;
