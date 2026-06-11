# PoMusic v2 🎵

A full-stack YouTube music streaming app. Search any song by name, build drag-and-drop queues, save playlists to your account, and listen in sync with friends in real time.

Upgrade of [Music-Player v1](https://github.com/Anupomp/Music-Player): the vanilla JS player is now TypeScript + React, with user accounts, PostgreSQL persistence, Redis caching, and Socket.io listen-together rooms.

## What's new in v2

| | v1 | v2 |
|---|---|---|
| Search | yt-dlp only (slow, unreliable, URLs in practice) | Real text search via youtube-sr (~0.5s) with yt-dlp fallback, Redis cached |
| Accounts | None | JWT auth (register/login), bcrypt hashed passwords |
| Playlists | Session only | Saved per-user in PostgreSQL |
| History | None | Every play recorded, History tab |
| Metadata | Re-fetched every play | Redis cache, 1 hour TTL per song |
| Listen together | None | 6-character room codes, host-controlled real-time sync |
| Frontend | Single 1300-line HTML file | TypeScript + React (Vite), componentized |
| Backend | server.js | TypeScript Express, route modules, typed services |

Everything from v1 still works: search, paste a video URL, import a playlist or radio/mix URL, drag-and-drop queue, synced lyrics (lrclib.net), ambient cover-art glow, keyboard shortcuts (space, ←/→, n, p).

## Tech stack

- **Backend:** Node.js, Express, TypeScript, yt-dlp
- **Database:** PostgreSQL (users, playlists, playlist_songs, listening_history)
- **Cache:** Redis via ioredis (song metadata, search results, room state)
- **Real-time:** Socket.io (JWT-authenticated)
- **Frontend:** React 18 + TypeScript + Vite, @hello-pangea/dnd for drag-and-drop
- **Auth:** jsonwebtoken + bcrypt, token held in memory only (never localStorage)
- **Infra:** Docker Compose (app + PostgreSQL + Redis)

## Quick start (Docker — recommended)

Requires Docker Desktop.

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string
docker compose up --build
```

Open http://localhost:3000, create an account, and search for a song.

The database schema is applied automatically on first boot. yt-dlp is installed inside the image and pulled at the latest release on every build, so rebuilding the image (`docker compose build --no-cache app`) is also how you fix YouTube breakage after a while.

## Local development (without Docker)

You need Node 20+, PostgreSQL, Redis, and yt-dlp on your PATH (`pip install yt-dlp` or `winget install yt-dlp`).

```bash
# Terminal 1 — backend
cd server
npm install
cp ../.env.example .env   # point DATABASE_URL/REDIS_URL at your local services
npm run dev               # ts-node-dev on :3000

# Terminal 2 — frontend
cd client
npm install
npm run dev               # Vite on :5173, proxies /api, /auth, and websockets to :3000
```

Open http://localhost:5173.

## How search works now (the v1 fix)

v1 shelled out to `yt-dlp ytsearch15:` for every search, which took 5–10 seconds and broke whenever yt-dlp went stale, so in practice you pasted URLs. v2 layers three strategies:

1. **Redis cache** — `search:{query}`, 10 minute TTL. Repeat searches are instant.
2. **youtube-sr** — scrapes YouTube's results page directly. No API key, typically under a second.
3. **yt-dlp fallback** — if the scraper fails (YouTube layout change), the old path still works.

Type a song name, press enter, click ▶ to play now or ＋ to add to the queue. Pasting video and playlist URLs still works exactly like v1.

## How the listen-together feature works

1. Log in and click **Listen together** in the top bar.
2. **Create a room** — you get a 6-character code (e.g. `KWX42P`). Click it to copy. Your current queue is snapshotted into the room.
3. Friends log in to the same server, click **Listen together → join with a code**, and enter the code.
4. The **host controls playback** — play/pause, seeking, skipping, and queue edits broadcast instantly to everyone in the room over Socket.io. Guests see controls disabled and a "Listening with host" badge.
5. Room state lives in Redis with a 12-hour TTL, so guests joining late get the current queue immediately.

One note: guests' browsers may block autoplay until they've interacted with the page once (a browser policy, not a bug). A click anywhere unblocks it.

## API overview

```
POST /auth/register            { email, password } → { token, email }
POST /auth/login               { email, password } → { token, email }

GET  /api/search?q=...         text search (cached)
GET  /api/stream?videoId=...   audio stream URL + metadata (cached 1h)
GET  /api/meta?videoId=...     metadata only
GET  /api/playlist?url=...     import a YouTube playlist/radio URL
GET  /api/lyrics?artist=&track=

# Authenticated (Bearer token)
GET/POST           /api/playlists
GET/PATCH/DELETE   /api/playlists/:id
POST/DELETE        /api/playlists/:id/songs[/:songId]
GET/POST           /api/history
POST               /api/rooms/create → { code }
GET                /api/rooms/:code

# Socket.io events (JWT in handshake auth)
join-room, sync-queue, play-pause, seek, leave-room
```

## Project structure

```
├── docker-compose.yml        app + postgres + redis
├── Dockerfile                multi-stage: client build → server build → runtime
├── server/
│   ├── sql/schema.sql        applied automatically on boot
│   └── src/
│       ├── index.ts          express + socket.io bootstrap
│       ├── middleware/auth.ts JWT sign/verify/middleware
│       ├── routes/           auth, stream, playlists, history, rooms
│       ├── services/         ytdlp (cached), search, lyrics
│       └── sockets/rooms.ts  listen-together handlers
└── client/
    └── src/
        ├── store.tsx          player state + room sync
        ├── api.ts             fetch wrapper, in-memory JWT
        └── components/        SearchBar, Queue, Player, LyricsPanel,
                               PlaylistSidebar, HistoryTab,
                               ListenTogetherModal, SaveToPlaylistModal, LoginPage
```

## Notes

- **JWT in memory:** refreshing the page logs you out. This is deliberate per the security spec (tokens are unreachable by storage-scanning XSS). If you want persistence later, the standard upgrade is a httpOnly refresh-token cookie.
- **Stream URLs expire:** googlevideo URLs are valid ~6h; the 1h Redis TTL keeps cached entries safely inside that window.
- **yt-dlp drift:** if streams stop working after a few months, update yt-dlp (rebuild the Docker image, or `yt-dlp -U` locally).
- This is for personal use; streaming YouTube audio this way is against YouTube's ToS, so don't deploy it publicly.
