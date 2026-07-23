export interface Track {
  id: string;
  title: string;
  channel: string;
  duration: number | null;
  thumb: string;
}

export interface Playlist {
  id: number;
  name: string;
  created_at: string;
  song_count: number;
}

export interface PlaylistSong {
  id: number;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  position: number;
}

export interface HistoryEntry {
  id: number;
  video_id: string;
  title: string;
  played_at: string;
}

export interface RoomState {
  code: string;
  hostUserId: number;
  queue: Track[];
  currentIndex: number;
  playing: boolean;
  position: number;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || isNaN(sec)) return '–:––';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
