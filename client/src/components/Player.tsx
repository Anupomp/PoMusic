import { useState, useEffect } from 'react';
import { usePlayer } from '../store';
import { formatDuration } from '../types';

export default function Player({ onSaveToPlaylist }: { onSaveToPlaylist: () => void }) {
  const { currentTrack, playing, loading, togglePlay, next, prev, seek, audioRef, room } = usePlayer();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const isGuest = room !== null && !room.isHost;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setTime(audio.currentTime); setDuration(audio.duration || 0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onTime);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onTime);
    };
  }, [audioRef]);

  // Keyboard shortcuts: space = play/pause, ←/→ = seek 5s, n/p = next/prev
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const audio = audioRef.current;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': if (audio) seek(Math.min(audio.currentTime + 5, audio.duration || 0)); break;
        case 'ArrowLeft': if (audio) seek(Math.max(audio.currentTime - 5, 0)); break;
        case 'n': next(); break;
        case 'p': prev(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, next, prev, seek, audioRef]);

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="player-bar">
      <div className="player-now">
        {currentTrack ? (
          <>
            <div className="cover-wrap">
              <img src={currentTrack.thumb} alt="" className="cover" />
              <img src={currentTrack.thumb} alt="" className="cover-glow" aria-hidden />
            </div>
            <div className="now-info">
              <div className="now-title" title={currentTrack.title}>{currentTrack.title}</div>
              <div className="now-channel">{currentTrack.channel}</div>
            </div>
            <button className="icon-btn save-btn" onClick={onSaveToPlaylist} title="Save to playlist">＋</button>
          </>
        ) : (
          <div className="now-info muted">Nothing playing</div>
        )}
      </div>

      <div className="player-controls">
        <div className="control-row">
          <button className="icon-btn" onClick={prev} disabled={isGuest} aria-label="Previous">⏮</button>
          <button className="play-btn" onClick={togglePlay} disabled={isGuest || !currentTrack} aria-label={playing ? 'Pause' : 'Play'}>
            {loading ? '…' : playing ? '⏸' : '▶'}
          </button>
          <button className="icon-btn" onClick={next} disabled={isGuest} aria-label="Next">⏭</button>
        </div>
        <div className="progress-row">
          <span className="time">{formatDuration(time)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={time}
            step={1}
            disabled={isGuest || !currentTrack}
            onChange={(e) => seek(Number(e.target.value))}
            className="progress"
            style={{ ['--pct' as string]: `${pct}%` }}
            aria-label="Seek"
          />
          <span className="time">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="player-extra">
        {isGuest && <span className="guest-badge">Listening with host</span>}
        <VolumeControl />
      </div>
    </div>
  );
}

function VolumeControl() {
  const { audioRef } = usePlayer();
  const [vol, setVol] = useState(1);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = vol;
  }, [vol, audioRef]);
  return (
    <div className="volume">
      <span aria-hidden>🔊</span>
      <input
        type="range" min={0} max={1} step={0.02} value={vol}
        onChange={(e) => setVol(Number(e.target.value))}
        aria-label="Volume"
      />
    </div>
  );
}
