import {
  createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode,
} from 'react';
import { api } from './api';
import { getSocket } from './socket';
import { Track, RoomState } from './types';

interface RoomInfo {
  code: string;
  isHost: boolean;
}

interface PlayerContextValue {
  queue: Track[];
  currentIndex: number;
  playing: boolean;
  loading: boolean;
  currentTrack: Track | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  room: RoomInfo | null;
  setQueue: (q: Track[]) => void;
  addToQueue: (t: Track, playNow?: boolean) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  playIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  seek: (sec: number) => void;
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueueState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Refs mirror state for use inside socket handlers without stale closures
  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const roomRef = useRef(room);
  queueRef.current = queue;
  indexRef.current = currentIndex;
  roomRef.current = room;

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const isGuest = room !== null && !room.isHost;

  const emitQueueSync = useCallback((q: Track[], idx: number) => {
    const r = roomRef.current;
    if (r?.isHost) getSocket().emit('sync-queue', { queue: q, currentIndex: idx });
  }, []);

  const loadAndPlay = useCallback(async (track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);
    try {
      const res = await api<{ url: string }>(`/api/stream?videoId=${track.id}`);
      audio.src = res.url;
      await audio.play();
      setPlaying(true);
      // Record history (fire and forget; ignored if it fails)
      api('/api/history', {
        method: 'POST',
        body: JSON.stringify({ video_id: track.id, title: track.title }),
      }).catch(() => {});
    } catch (err) {
      console.error('Playback failed:', err);
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const playIndex = useCallback((index: number, fromSync = false) => {
    const q = queueRef.current;
    if (index < 0 || index >= q.length) return;
    if (isGuest && !fromSync) return; // guests don't control playback
    setCurrentIndex(index);
    loadAndPlay(q[index]);
    if (!fromSync) emitQueueSync(q, index);
  }, [isGuest, loadAndPlay, emitQueueSync]);

  const setQueue = useCallback((q: Track[]) => {
    setQueueState(q);
    emitQueueSync(q, indexRef.current);
  }, [emitQueueSync]);

  const addToQueue = useCallback((t: Track, playNow = false) => {
    setQueueState((prev) => {
      const next = [...prev, t];
      const idx = playNow ? next.length - 1 : indexRef.current;
      if (playNow) {
        setCurrentIndex(idx);
        loadAndPlay(t);
      }
      emitQueueSync(next, idx);
      return next;
    });
  }, [loadAndPlay, emitQueueSync]);

  const removeFromQueue = useCallback((index: number) => {
    setQueueState((prev) => {
      const next = prev.filter((_, i) => i !== index);
      let idx = indexRef.current;
      if (index < idx) idx -= 1;
      else if (index === idx) { /* keep idx; next track now occupies it */ }
      if (idx >= next.length) idx = next.length - 1;
      setCurrentIndex(idx);
      emitQueueSync(next, idx);
      return next;
    });
  }, [emitQueueSync]);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueueState((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      let idx = indexRef.current;
      if (from === idx) idx = to;
      else if (from < idx && to >= idx) idx -= 1;
      else if (from > idx && to <= idx) idx += 1;
      setCurrentIndex(idx);
      emitQueueSync(next, idx);
      return next;
    });
  }, [emitQueueSync]);

  const next = useCallback(() => {
    playIndex(indexRef.current + 1);
  }, [playIndex]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    playIndex(indexRef.current - 1);
  }, [playIndex]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isGuest) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
    const r = roomRef.current;
    if (r?.isHost) {
      getSocket().emit('play-pause', {
        playing: audio.paused === false,
        position: audio.currentTime,
        currentIndex: indexRef.current,
      });
    }
  }, [isGuest]);

  const seek = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio || isGuest) return;
    audio.currentTime = sec;
    const r = roomRef.current;
    if (r?.isHost) getSocket().emit('seek', { position: sec });
  }, [isGuest]);

  // Auto-advance at end of track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (roomRef.current && !roomRef.current.isHost) return;
      if (indexRef.current + 1 < queueRef.current.length) playIndex(indexRef.current + 1);
      else setPlaying(false);
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [playIndex]);

  // ── Listen together ────────────────────────────────────────
  const createRoom = useCallback(async (): Promise<string> => {
    const res = await api<{ code: string }>('/api/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ queue: queueRef.current, currentIndex: indexRef.current }),
    });
    const socket = getSocket();
    await new Promise<void>((resolve, reject) => {
      socket.emit('join-room', res.code, (resp: { error?: string }) =>
        resp?.error ? reject(new Error(resp.error)) : resolve()
      );
    });
    setRoom({ code: res.code, isHost: true });
    return res.code;
  }, []);

  const joinRoom = useCallback(async (code: string): Promise<void> => {
    const socket = getSocket();
    const resp = await new Promise<{ error?: string; room?: RoomState; isHost?: boolean }>((resolve) => {
      socket.emit('join-room', code, resolve);
    });
    if (resp.error || !resp.room) throw new Error(resp.error || 'Could not join room');
    setRoom({ code: resp.room.code, isHost: !!resp.isHost });
    setQueueState(resp.room.queue || []);
    setCurrentIndex(resp.room.currentIndex ?? -1);
    const track = (resp.room.queue || [])[resp.room.currentIndex];
    if (track && resp.room.playing) loadAndPlay(track);
  }, [loadAndPlay]);

  const leaveRoom = useCallback(() => {
    getSocket().emit('leave-room');
    setRoom(null);
  }, []);

  // Guest-side sync handlers
  useEffect(() => {
    if (!room || room.isHost) return;
    const socket = getSocket();

    const onSyncQueue = (payload: { queue: Track[]; currentIndex: number }) => {
      setQueueState(payload.queue || []);
      const idx = payload.currentIndex ?? -1;
      if (idx !== indexRef.current && payload.queue?.[idx]) {
        setCurrentIndex(idx);
        loadAndPlay(payload.queue[idx]);
      } else {
        setCurrentIndex(idx);
      }
    };

    const onPlayPause = (payload: { playing: boolean; position: number; currentIndex: number }) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (payload.currentIndex !== indexRef.current && queueRef.current[payload.currentIndex]) {
        setCurrentIndex(payload.currentIndex);
        loadAndPlay(queueRef.current[payload.currentIndex]);
        return;
      }
      if (Math.abs(audio.currentTime - payload.position) > 2) audio.currentTime = payload.position;
      if (payload.playing) audio.play().then(() => setPlaying(true)).catch(() => {});
      else { audio.pause(); setPlaying(false); }
    };

    const onSeek = (payload: { position: number }) => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = payload.position;
    };

    socket.on('sync-queue', onSyncQueue);
    socket.on('play-pause', onPlayPause);
    socket.on('seek', onSeek);
    return () => {
      socket.off('sync-queue', onSyncQueue);
      socket.off('play-pause', onPlayPause);
      socket.off('seek', onSeek);
    };
  }, [room, loadAndPlay]);

  return (
    <PlayerContext.Provider
      value={{
        queue, currentIndex, playing, loading, currentTrack, audioRef, room,
        setQueue, addToQueue, removeFromQueue, reorderQueue,
        playIndex: (i: number) => playIndex(i),
        next, prev, togglePlay, seek,
        createRoom, joinRoom, leaveRoom,
      }}
    >
      {children}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
