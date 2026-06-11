-- PoMusic v2 schema. Applied automatically on server boot (see src/db.ts).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlists (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id            SERIAL PRIMARY KEY,
  playlist_id   INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id      TEXT NOT NULL,
  title         TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_sec  INTEGER,
  position      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listening_history (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id  TEXT NOT NULL,
  title     TEXT NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user        ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_pl     ON playlist_songs(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_history_user_time     ON listening_history(user_id, played_at DESC);
