import { Server, Socket } from 'socket.io';
import { redis } from '../redis';
import { config } from '../config';
import { verifyToken } from '../middleware/auth';
import { roomKey, RoomState } from '../routes/rooms';

interface SocketData {
  userId: number;
  email: string;
  roomCode?: string;
}

async function loadRoom(code: string): Promise<RoomState | null> {
  const raw = await redis.get(roomKey(code));
  return raw ? (JSON.parse(raw) as RoomState) : null;
}

async function saveRoom(state: RoomState): Promise<void> {
  state.updatedAt = Date.now();
  await redis.set(roomKey(state.code), JSON.stringify(state), 'EX', config.roomTtlSec);
}

export function registerRoomHandlers(io: Server): void {
  // Authenticate sockets with the same JWT used for HTTP
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = verifyToken(token);
      (socket.data as SocketData).userId = payload.sub;
      (socket.data as SocketData).email = payload.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    const isHost = async (): Promise<boolean> => {
      if (!data.roomCode) return false;
      const room = await loadRoom(data.roomCode);
      return !!room && room.hostUserId === data.userId;
    };

    // 'join-room' (roomCode) — join a socket room and receive current state
    socket.on('join-room', async (roomCode: string, ack?: (resp: unknown) => void) => {
      const code = String(roomCode || '').toUpperCase();
      const room = await loadRoom(code);
      if (!room) return ack?.({ error: 'Room not found or expired' });

      if (data.roomCode) socket.leave(data.roomCode);
      data.roomCode = code;
      socket.join(code);

      socket.to(code).emit('member-joined', { email: data.email });
      ack?.({ room, isHost: room.hostUserId === data.userId });
    });

    // 'sync-queue' (queue, currentIndex) — host broadcasts queue updates
    socket.on('sync-queue', async (payload: { queue: unknown[]; currentIndex: number }) => {
      if (!data.roomCode || !(await isHost())) return;
      const room = await loadRoom(data.roomCode);
      if (!room) return;
      room.queue = payload.queue ?? [];
      room.currentIndex = payload.currentIndex ?? 0;
      await saveRoom(room);
      socket.to(data.roomCode).emit('sync-queue', payload);
    });

    // 'play-pause' (state) — host syncs play/pause across the room
    socket.on('play-pause', async (payload: { playing: boolean; position: number; currentIndex: number }) => {
      if (!data.roomCode || !(await isHost())) return;
      const room = await loadRoom(data.roomCode);
      if (!room) return;
      room.playing = payload.playing;
      room.position = payload.position ?? room.position;
      room.currentIndex = payload.currentIndex ?? room.currentIndex;
      await saveRoom(room);
      socket.to(data.roomCode).emit('play-pause', payload);
    });

    // 'seek' (position) — host syncs playback position
    socket.on('seek', async (payload: { position: number }) => {
      if (!data.roomCode || !(await isHost())) return;
      const room = await loadRoom(data.roomCode);
      if (!room) return;
      room.position = payload.position;
      await saveRoom(room);
      socket.to(data.roomCode).emit('seek', payload);
    });

    socket.on('leave-room', () => {
      if (!data.roomCode) return;
      socket.to(data.roomCode).emit('member-left', { email: data.email });
      socket.leave(data.roomCode);
      data.roomCode = undefined;
    });

    socket.on('disconnect', () => {
      if (data.roomCode) socket.to(data.roomCode).emit('member-left', { email: data.email });
    });
  });
}
