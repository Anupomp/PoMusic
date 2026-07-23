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
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] items-center gap-5 px-6 py-3 bg-paper border-t-[3px] border-ink">
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <img src={currentTrack.thumb} alt="" className="w-14 h-14 object-cover border-2 border-ink shadow-brut-sm shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold truncate" title={currentTrack.title}>{currentTrack.title}</div>
              <div className="text-xs text-smoke">{currentTrack.channel}</div>
            </div>
            <button className="icon-square w-8 h-8 bg-lime shrink-0" onClick={onSaveToPlaylist} title="Save to playlist">＋</button>
          </>
        ) : (
          <div className="text-smoke text-sm font-display uppercase">Nothing playing</div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-center items-center gap-4">
          <button className="icon-square w-9 h-9 disabled:opacity-40" onClick={prev} disabled={isGuest} aria-label="Previous">⏮</button>
          <button
            className="icon-square w-12 h-12 bg-lime shadow-brut-sm disabled:opacity-40 text-lg"
            onClick={togglePlay} disabled={isGuest || !currentTrack}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {loading ? '…' : playing ? '⏸' : '▶'}
          </button>
          <button className="icon-square w-9 h-9 disabled:opacity-40" onClick={next} disabled={isGuest} aria-label="Next">⏭</button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-smoke tabular-nums w-9">{formatDuration(time)}</span>
          <input
            type="range" min={0} max={duration || 0} value={time} step={1}
            disabled={isGuest || !currentTrack}
            onChange={(e) => seek(Number(e.target.value))}
            className="brut-range flex-1"
            style={{ ['--pct' as string]: `${pct}%` }}
            aria-label="Seek"
          />
          <span className="text-[11px] text-smoke tabular-nums w-9">{formatDuration(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        {isGuest && (
          <span className="font-display font-bold uppercase text-xs bg-coral text-paper border-2 border-ink px-2 py-1">
            Guest
          </span>
        )}
        <VolumeControl />
      </div>
    </div>
  );
}

function VolumeControl() {
  const { audioRef } = usePlayer();
  const [vol, setVol] = useState(1);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = vol; }, [vol, audioRef]);
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden>🔊</span>
      <input
        type="range" min={0} max={1} step={0.02} value={vol}
        onChange={(e) => setVol(Number(e.target.value))}
        className="brut-range w-[90px]"
        style={{ ['--pct' as string]: `${vol * 100}%` }}
        aria-label="Volume"
      />
    </div>
  );
}
