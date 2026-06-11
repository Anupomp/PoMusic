import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server } from 'socket.io';
import { config } from './config';
import { initDb } from './db';
import authRoutes from './routes/auth';
import streamRoutes from './routes/stream';
import playlistRoutes from './routes/playlists';
import historyRoutes from './routes/history';
import roomRoutes from './routes/rooms';
import { registerRoomHandlers } from './sockets/rooms';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '2.0.0' }));

app.use('/auth', authRoutes);
app.use('/api', streamRoutes);          // /api/search, /api/stream, /api/meta, /api/playlist, /api/lyrics
app.use('/api/playlists', playlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/rooms', roomRoutes);

// In production (Docker), serve the built React app
const clientDist = path.join(__dirname, '..', 'public');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next());
});

registerRoomHandlers(io);

async function main() {
  await initDb();
  server.listen(config.port, () => {
    console.log(`\n🎵 PoMusic v2 running at http://localhost:${config.port}\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
